package ai.altrucoder.backend.cli

import ai.altrucoder.log.AltruCoderLog
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.util.SystemInfo
import com.intellij.util.system.CpuArch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.security.SecureRandom
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * Manages the Altru Coder CLI binary lifecycle.
 *
 * Extracts the bundled CLI from JAR resources into IntelliJ's system directory,
 * spawns `altru-coder serve --port 0`, and exposes the result as [State].
 *
 * Concurrency is handled by the owning [AltruCoderBackendAppService] — all public
 * methods except [exited] are called under its mutex. [exited] is called from
 * [AltruCoderConnectionService]'s IO dispatcher and is thread-safe via the stale-ref
 * guard and volatile [process] field.
 */
class AltruCoderBackendCliManager(
    private val log: AltruCoderLog = AltruCoderLog.create(AltruCoderBackendCliManager::class.java),
) : CliServer {

    companion object {
        private const val STARTUP_TIMEOUT_MS = 30_000L
        private const val KILL_TIMEOUT_SECONDS = 5L
        private val PORT_REGEX = Regex("""listening on http://[\w.]+:(\d+)""")
    }

    @Volatile
    private var process: Process? = null
    private var hook: Thread? = null

    @Volatile
    override var forceExtract = false

    override fun process(): Process? = process

    override suspend fun init(): CliServer.State {
        return try {
            val path = extractCli()
            log.info("CLI binary path: ${path.absolutePath} (size=${path.length()} bytes)")
            withTimeout(STARTUP_TIMEOUT_MS) {
                spawn(path)
            }
        } catch (e: Exception) {
            log.warn("CLI startup failed", e)
            process?.let { proc ->
                log.info("Cleaning up orphaned CLI process (pid=${proc.pid()})")
                process = null
                uninstall()
                kill(proc, "startup failure cleanup")
            }
            CliServer.State.Error(
                message = e.message ?: "Unknown error",
                details = e.stackTraceToString(),
            )
        }
    }

    override fun exited(proc: Process) {
        if (process != proc) return
        process = null
        uninstall()
    }

    override fun stop() {
        val proc = process ?: return
        process = null
        uninstall()
        kill(proc, "stop()")
    }

    private fun extractCli(): File {
        val platform = platform()
        val exe = if (SystemInfo.isWindows) "altru-coder.exe" else "altru-coder"
        val resource = "cli/$platform/$exe"
        val loader = javaClass.classLoader

        val target = File(PathManager.getSystemPath(), "altru-coder/bin/$exe")

        if (forceExtract && target.exists()) {
            log.info("Force re-extracting CLI binary — deleting ${target.absolutePath}")
            target.delete()
            forceExtract = false
        }

        val url = loader.getResource(resource)
            ?: throw IllegalStateException("CLI binary not found in JAR resources at $resource")

        val size = url.openConnection().contentLengthLong
        if (size >= 0 && target.exists() && target.length() == size) {
            log.info("CLI binary up-to-date at ${target.absolutePath}")
            return target
        }

        log.info("Extracting CLI binary to ${target.absolutePath}")
        target.parentFile.mkdirs()

        url.openStream().use { input ->
            target.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        if (!SystemInfo.isWindows) {
            target.setExecutable(true)
        }

        return target
    }

    private suspend fun spawn(cli: File): CliServer.State =
        withContext(Dispatchers.IO) {
            val pwd = generatePassword()

            val env = buildMap {
                putAll(System.getenv())
                put("ALTRU_CODER_SERVER_PASSWORD", pwd)
                put("ALTRU_CODER_CLIENT", "jetbrains")
                put("ALTRU_CODER_ENABLE_QUESTION_TOOL", "true")
                put("ALTRU_CODER_PLATFORM", "jetbrains")
                put("ALTRU_CODER_APP_NAME", "altru-coder")
                put("ALTRU_CODER_DISABLE_CLAUDE_CODE", "true")
                put("ALTRUCODER_FEATURE", "jetbrains-plugin")
                ideEnv().forEach { (k, v) -> put(k, v) }
            }

            val cmd = listOf(cli.absolutePath, "serve", "--port", "0")
            val builder = ProcessBuilder(cmd)
            builder.environment().clear()
            builder.environment().putAll(env)
            builder.redirectErrorStream(false)

            log.info("Starting CLI: ${cmd.joinToString(" ")}")
            log.info("CLI env: ALTRU_CODER_CLIENT=jetbrains ALTRU_CODER_PLATFORM=jetbrains ALTRU_CODER_APP_NAME=altru-coder")
            val proc = builder.start()
            log.info("CLI process started (pid=${proc.pid()})")
            process = proc
            install(proc)

            val stderr = StringBuilder()

            Thread({
                BufferedReader(InputStreamReader(proc.errorStream)).use { reader ->
                    reader.lineSequence().forEach { line ->
                        log.warn("CLI stderr: $line")
                        synchronized(stderr) { stderr.appendLine(line) }
                    }
                }
            }, "altru-coder-cli-stderr").apply { isDaemon = true; start() }

            BufferedReader(InputStreamReader(proc.inputStream)).use { reader ->
                for (line in reader.lineSequence()) {
                    log.info("CLI stdout: $line")
                    val match = PORT_REGEX.find(line)
                    if (match != null) {
                        val p = match.groupValues[1].toInt()
                        log.info("CLI server ready on port $p")
                        return@withContext CliServer.State.Ready(port = p, password = pwd)
                    }

                    if (!proc.isAlive) break
                }
            }

            val code = proc.waitFor()
            val details = synchronized(stderr) { stderr.toString().trim() }
            process = null
            uninstall()
            CliServer.State.Error(
                message = "CLI process exited with code $code before announcing a port",
                details = details.ifEmpty { null },
            )
        }

    override fun dispose() {
        val proc = process ?: return
        process = null
        uninstall()
        kill(proc, "Disposing")
    }

    private fun install(proc: Process) {
        uninstall()
        val next = Thread({
            log.info("Shutdown hook — killing CLI process tree (pid ${proc.pid()})")
            kill(proc, "Shutdown hook", wait = false)
        }, "altru-coder-cli-shutdown")
        val ok = runCatching { Runtime.getRuntime().addShutdownHook(next) }
        if (ok.isFailure) {
            log.warn("Failed to install CLI shutdown hook", ok.exceptionOrNull())
            return
        }
        hook = next
    }

    private fun uninstall() {
        val curr = hook ?: return
        hook = null
        val ok = runCatching { Runtime.getRuntime().removeShutdownHook(curr) }
        if (ok.isFailure) {
            log.info("Skipping CLI shutdown hook removal: ${ok.exceptionOrNull()?.message}")
        }
    }

    private fun kill(proc: Process, source: String, wait: Boolean = true) {
        log.info("$source — killing CLI process tree (pid ${proc.pid()})")
        children(proc).forEach { it.destroy() }
        proc.destroy()
        if (!wait) return
        if (!proc.waitFor(KILL_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            log.warn("CLI process did not exit after SIGTERM, sending SIGKILL")
            children(proc).forEach { it.destroyForcibly() }
            proc.destroyForcibly()
        }
    }

    private fun children(proc: Process): List<ProcessHandle> =
        proc.toHandle().descendants().toList().asReversed()

    private fun platform(): String {
        val os = when {
            SystemInfo.isMac -> "darwin"
            SystemInfo.isLinux -> "linux"
            SystemInfo.isWindows -> "windows"
            else -> throw IllegalStateException("Unsupported OS: ${System.getProperty("os.name")}")
        }
        val arch = when (CpuArch.CURRENT) {
            CpuArch.ARM64 -> "arm64"
            CpuArch.X86_64 -> "x64"
            else -> throw IllegalStateException("Unsupported architecture: ${CpuArch.CURRENT}")
        }
        return "$os-$arch"
    }

    private fun ideEnv(): Map<String, String> = buildMap {
        runCatching {
            val info = ApplicationInfo.getInstance()
            val name = info.fullApplicationName
            val build = info.build.asString()
            put("ALTRU_CODER_EDITOR_NAME", name)
            put("ALTRUCODER_EDITOR_NAME", "$name $build")
        }.onFailure { log.info("Could not read ApplicationInfo: ${it.message}") }

        runCatching {
            val version = PluginManagerCore
                .getPlugin(PluginId.getId("ai.altrucoder"))?.version
            if (version != null) put("ALTRU_CODER_APP_VERSION", version)
        }.onFailure { log.info("Could not read plugin version: ${it.message}") }

        runCatching {
            put("ALTRU_CODER_MACHINE_ID", machineId())
        }.onFailure { log.info("Could not read machine ID: ${it.message}") }
    }

    private fun machineId(): String {
        val file = File(PathManager.getSystemPath(), "altru-coder/machine-id")
        if (file.exists()) return file.readText().trim()
        val id = UUID.randomUUID().toString()
        file.parentFile.mkdirs()
        file.writeText(id)
        return id
    }

    private fun generatePassword(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
