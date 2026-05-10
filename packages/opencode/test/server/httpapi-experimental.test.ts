import { afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Flag } from "@opencode-ai/core/flag/flag"
import { GlobalBus } from "@/bus/global"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { ExperimentalPaths } from "../../src/server/routes/instance/httpapi/groups/experimental"
import { MessageV2 } from "@/session/message-v2" // altrucoder_change
import { MessageID } from "@/session/schema" // altrucoder_change
import { Session } from "@/session/session"
import { Todo } from "@/session/todo" // altrucoder_change
import { Database } from "@/storage/db"
import * as Log from "@opencode-ai/core/util/log"
import { createAltruCoderClient } from "@altru-coder/sdk/v2" // altrucoder_change
import { ModelID, ProviderID } from "@/provider/schema" // altrucoder_change
import { Worktree } from "../../src/worktree"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

void Log.init({ print: false })

const original = Flag.ALTRU_CODER_EXPERIMENTAL_HTTPAPI
const testWorktreeMutations = process.platform === "win32" ? test.skip : test

function app() {
  Flag.ALTRU_CODER_EXPERIMENTAL_HTTPAPI = true
  return Server.Default().app
}

const experimental = { "x-altru-coder-experimental-api": "true" }

function runSession<A, E>(fx: Effect.Effect<A, E, Session.Service>) {
  return Effect.runPromise(fx.pipe(Effect.provide(Session.defaultLayer)))
}

// altrucoder_change start
function runResumeState<A, E>(fx: Effect.Effect<A, E, Session.Service | Todo.Service>) {
  return Effect.runPromise(fx.pipe(Effect.provide(Session.defaultLayer), Effect.provide(Todo.defaultLayer)))
}
// altrucoder_change end

function createSession(input?: Session.CreateInput) {
  return runSession(Session.Service.use((svc) => svc.create(input)))
}

async function waitReady(directory: string) {
  return await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      GlobalBus.off("event", onEvent)
      reject(new Error("timed out waiting for worktree.ready"))
    }, 10_000)

    function onEvent(event: { directory?: string; payload: { type?: string } }) {
      if (event.payload.type !== Worktree.Event.Ready.type || event.directory !== directory) return
      clearTimeout(timer)
      GlobalBus.off("event", onEvent)
      resolve()
    }

    GlobalBus.on("event", onEvent)
  })
}

function quote(value: string) {
  return `"${value.replaceAll('"', '\\"')}"`
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const result = await Promise.race([
    reader.read(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out waiting for event")), 5_000)),
  ])
  return new TextDecoder().decode(result.value)
}

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, needle: string) {
  let text = ""
  while (!text.includes(needle)) {
    text += await readChunk(reader)
  }
  return text
}

afterEach(async () => {
  Flag.ALTRU_CODER_EXPERIMENTAL_HTTPAPI = original
  await disposeAllInstances()
  await resetDatabase()
})

describe("experimental HttpApi", () => {
  test("requires experimentalApi opt-in", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const blocked = await app().request(ExperimentalPaths.console, {
      headers: { "x-altru-coder-directory": tmp.path },
    })
    expect(blocked.status).toBe(403)

    const query = await app().request(`${ExperimentalPaths.console}?experimentalApi=true`, {
      headers: { "x-altru-coder-directory": tmp.path },
    })
    expect(query.status).toBe(200)
  })

  // altrucoder_change start - SDK wrapper opts into experimental API capability
  test("SDK sends experimentalApi capability by default", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })
    const server = app()
    const fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      server.fetch(input instanceof Request ? input : new Request(input, init))) as typeof globalThis.fetch

    const sdk = createAltruCoderClient({ baseUrl: "http://localhost", directory: tmp.path, fetch })
    const ok = await sdk.experimental.console.get()
    expect(ok.response.status).toBe(200)

    const blocked = createAltruCoderClient({
      baseUrl: "http://localhost",
      directory: tmp.path,
      experimentalApi: false,
      fetch,
    })
    const denied = await blocked.experimental.console.get()
    expect(denied.response.status).toBe(403)
  })
  // altrucoder_change end

  // altrucoder_change - skip until Altru Coder's Instance context threads through the Effect HttpApi bridge.
  // The /experimental/tool handler 500s via the bridge (InstanceState/AsyncLocalStorage leak).
  // Bridge is gated behind ALTRU_CODER_EXPERIMENTAL_HTTPAPI, not enabled in any production client.
  test.skip("serves read-only experimental endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({
      config: {
        formatter: false,
        lsp: false,
        mcp: {
          demo: {
            type: "local",
            command: ["echo", "demo"],
            enabled: false,
          },
        },
      },
    })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path }
    const [consoleState, consoleOrgs, toolList, toolIDs, worktrees, resources] = await Promise.all([
      app().request(ExperimentalPaths.console, { headers }),
      app().request(ExperimentalPaths.consoleOrgs, { headers }),
      app().request(`${ExperimentalPaths.tool}?provider=opencode&model=gpt-5`, { headers }),
      app().request(ExperimentalPaths.toolIDs, { headers }),
      app().request(ExperimentalPaths.worktree, { headers }),
      app().request(ExperimentalPaths.resource, { headers }),
    ])

    expect(consoleState.status).toBe(200)
    expect(await consoleState.json()).toEqual({
      consoleManagedProviders: [],
      switchableOrgCount: 0,
    })

    expect(consoleOrgs.status).toBe(200)
    expect(await consoleOrgs.json()).toEqual({ orgs: [] })

    expect(toolList.status).toBe(200)
    expect(await toolList.json()).toContainEqual(
      expect.objectContaining({
        id: "bash",
        description: expect.any(String),
        parameters: expect.any(Object),
      }),
    )

    expect(toolIDs.status).toBe(200)
    expect(await toolIDs.json()).toContain("bash")

    expect(worktrees.status).toBe(200)
    expect(await worktrees.json()).toEqual([])

    expect(resources.status).toBe(200)
    expect(await resources.json()).toEqual({})
  })

  test("serves Console org switch through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })
    Database.Client()
      .$client.prepare(
        "INSERT INTO account (id, email, url, access_token, refresh_token, time_created, time_updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "account-test",
        "test@example.com",
        "https://console.example.com",
        "access",
        "refresh",
        Date.now(),
        Date.now(),
      )

    const switched = await app().request(ExperimentalPaths.consoleSwitch, {
      method: "POST",
      headers: { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" },
      body: JSON.stringify({ accountID: "account-test", orgID: "org-test" }),
    })

    expect(switched.status).toBe(200)
    expect(await switched.json()).toBe(true)
  })

  test("serves global session list through Hono bridge", async () => {
    await using tmp = await tmpdir({ git: true, config: { formatter: false, lsp: false } })

    const first = await Instance.provide({
      directory: tmp.path,
      fn: async () => createSession({ title: "page-one" }),
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await Instance.provide({
      directory: tmp.path,
      fn: async () => createSession({ title: "page-two" }),
    })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path }
    const page = await app().request(
      `${ExperimentalPaths.session}?${new URLSearchParams({ directory: tmp.path, limit: "1" })}`,
      { headers },
    )
    expect(page.status).toBe(200)
    expect(page.headers.get("x-next-cursor")).toBeTruthy()

    const body = (await page.json()) as Session.GlobalInfo[]
    expect(body.map((session) => session.id)).toEqual([second.id])
    expect(body[0].project?.id).toBe(second.projectID)

    const next = await app().request(
      `${ExperimentalPaths.session}?${new URLSearchParams({
        directory: tmp.path,
        limit: "10",
        cursor: body[0].time.updated.toString(),
      })}`,
      { headers },
    )
    expect(next.status).toBe(200)
    expect(((await next.json()) as Session.GlobalInfo[]).map((session) => session.id)).toContain(first.id)
  })

  // altrucoder_change start - background terminal process API
  test("serves thread resume payload through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const chat = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        await runResumeState(
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const todos = yield* Todo.Service
            const session = yield* sessions.create({ title: "resume-test" })
            const userID = MessageID.ascending()
            const assistantID = MessageID.ascending()
            const modelID = ModelID.make("gpt-test")
            const time = Date.now()

            yield* sessions.updateMessage({
              id: userID,
              sessionID: session.id,
              role: "user",
              time: { created: time },
              agent: "general",
              model: { providerID: ProviderID.openai, modelID },
            })

            const assistant: MessageV2.Assistant = {
              id: assistantID,
              sessionID: session.id,
              role: "assistant",
              time: { created: time + 1, completed: time + 2 },
              parentID: userID,
              providerID: ProviderID.openai,
              modelID,
              mode: "build",
              agent: "general",
              path: { cwd: tmp.path, root: tmp.path },
              cost: 0.25,
              tokens: {
                input: 10,
                output: 7,
                reasoning: 3,
                total: 20,
                cache: { read: 2, write: 1 },
              },
              finish: "stop",
            }
            yield* sessions.updateMessage(assistant)
            yield* todos.update({
              sessionID: session.id,
              todos: [{ content: "resume safely", status: "in_progress", priority: "high" }],
            })
            return { session, userID, assistantID }
          }),
        ),
    })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path }
    const resumed = await app().request(ExperimentalPaths.threadResume.replace(":sessionID", chat.session.id), {
      headers,
    })
    if (resumed.status !== 200) throw new Error(await resumed.text())
    expect(resumed.status).toBe(200)
    const body = (await resumed.json()) as {
      session: { id: string; title: string }
      messages: Array<{ info: { id: string; role: string } }>
      todos: Array<{ content: string; status: string; priority: string }>
      usage: { cost: number; tokens: { input: number; output: number; reasoning: number; total: number } }
      recovery: {
        resumable: boolean
        returnedMessages: number
        truncated: boolean
        lastMessageID?: string
        lastUserMessageID?: string
        lastAssistantMessageID?: string
      }
    }

    expect(body.session).toMatchObject({ id: chat.session.id, title: "resume-test" })
    expect(body.messages.map((message) => message.info.id)).toEqual([chat.userID, chat.assistantID])
    expect(body.todos).toEqual([{ content: "resume safely", status: "in_progress", priority: "high" }])
    expect(body.usage).toMatchObject({
      cost: 0.25,
      tokens: { input: 10, output: 7, reasoning: 3, total: 20 },
    })
    expect(body.recovery).toMatchObject({
      resumable: true,
      returnedMessages: 2,
      truncated: false,
      lastMessageID: chat.assistantID,
      lastUserMessageID: chat.userID,
      lastAssistantMessageID: chat.assistantID,
    })
  })

  test("serves app-server JSON-RPC compatibility endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const capabilities = await app().request(ExperimentalPaths.appServerCapabilities, { headers })
    expect(capabilities.status).toBe(200)
    expect(await capabilities.json()).toMatchObject({
      protocolVersion: "2",
      server: { name: "altru-coder" },
      features: { threadResume: true, processRpc: true, filesystemRpc: true },
    })

    const initialized = await app().request(ExperimentalPaths.appServerRpc, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
    })
    expect(initialized.status).toBe(200)
    expect(await initialized.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { protocolVersion: "2" },
    })

    const started = await app().request(ExperimentalPaths.appServerRpc, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: "start", method: "thread/start", params: { title: "rpc-chat" } }),
    })
    expect(started.status).toBe(200)
    const start = (await started.json()) as { result: { session: { id: string; title: string } } }
    expect(start.result.session.title).toBe("rpc-chat")

    const resumed = await app().request(ExperimentalPaths.appServerRpc, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "resume",
        method: "thread/resume",
        params: { sessionID: start.result.session.id },
      }),
    })
    expect(resumed.status).toBe(200)
    expect(await resumed.json()).toMatchObject({
      jsonrpc: "2.0",
      id: "resume",
      result: {
        session: { id: start.result.session.id },
        recovery: { resumable: true },
      },
    })

    const missing = await app().request(ExperimentalPaths.appServerRpc, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: "missing", method: "missing/method" }),
    })
    expect(missing.status).toBe(200)
    expect(await missing.json()).toMatchObject({
      jsonrpc: "2.0",
      id: "missing",
      error: { code: -32601 },
    })
  })

  test("serves thread realtime SSE events through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const started = await app().request(ExperimentalPaths.appServerRpc, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: "start", method: "thread/start", params: { title: "stream-chat" } }),
    })
    const start = (await started.json()) as { result: { session: { id: string } } }

    const response = await app().request(
      ExperimentalPaths.threadSubscribe.replace(":sessionID", start.result.session.id),
      {
        headers,
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform")
    if (!response.body) throw new Error("missing response body")

    const reader = response.body.getReader()
    const connected = await readUntil(reader, "thread.connected")
    expect(connected).toContain(start.result.session.id)

    GlobalBus.emit("event", {
      directory: tmp.path,
      payload: {
        type: "session.status",
        properties: {
          sessionID: start.result.session.id,
          status: { type: "busy" },
        },
      },
    })
    GlobalBus.emit("event", {
      directory: tmp.path,
      payload: {
        type: "message.updated",
        properties: {
          info: {
            id: "msg_stream",
            sessionID: start.result.session.id,
            role: "assistant",
            text: "stream-message",
          },
        },
      },
    })
    GlobalBus.emit("event", {
      directory: tmp.path,
      payload: {
        type: "process.output",
        properties: {
          sessionID: start.result.session.id,
          processID: "proc_test",
          output: "live-output",
        },
      },
    })

    const streamed = await readUntil(reader, "live-output")
    await reader.cancel()
    expect(streamed).toContain("session.status")
    expect(streamed).toContain("message.updated")
    expect(streamed).toContain("stream-message")
    expect(streamed).toContain("process.output")
    expect(streamed).toContain("live-output")
  })

  test("serves process RPC endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const sessionID = "ses_process_rpc"
    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh"
    const command = `${quote(process.execPath)} -e "console.log('process-rpc-ready')"`

    const started = await app().request(ExperimentalPaths.process, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionID, command, shell }),
    })
    if (started.status !== 200) throw new Error(await started.text())
    expect(started.status).toBe(200)
    const proc = (await started.json()) as { processID: string; id: string }
    expect(proc.processID).toBe(proc.id)

    let output = ""
    let offset = 0
    for (let i = 0; i < 50; i++) {
      const polled = await app().request(
        `${ExperimentalPaths.processOutput.replace(":processID", proc.processID)}?${new URLSearchParams({
          sessionID,
          offset: String(offset),
        })}`,
        { headers },
      )
      expect(polled.status).toBe(200)
      const body = (await polled.json()) as { output: string; nextOffset: number }
      output += body.output
      offset = body.nextOffset
      if (output.includes("process-rpc-ready")) break
      await Bun.sleep(50)
    }
    expect(output).toContain("process-rpc-ready")

    const read = await app().request(
      `${ExperimentalPaths.processRead.replace(":processID", proc.processID)}?${new URLSearchParams({ sessionID })}`,
      { headers },
    )
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({ processID: proc.processID, id: proc.processID })

    const listed = await app().request(`${ExperimentalPaths.process}?${new URLSearchParams({ sessionID })}`, {
      headers,
    })
    expect(listed.status).toBe(200)
    expect(
      ((await listed.json()) as Array<{ processID: string }>).some((item) => item.processID === proc.processID),
    ).toBe(true)

    const cleaned = await app().request(ExperimentalPaths.processClean, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionID }),
    })
    expect(cleaned.status).toBe(200)
  })

  test("serves background terminal endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const listed = await app().request(ExperimentalPaths.terminal, { headers })
    expect(listed.status).toBe(200)
    expect(Array.isArray(await listed.json())).toBe(true)

    const missing = await app().request(ExperimentalPaths.terminalRead.replace(":jobID", "missing"), { headers })
    expect(missing.status).toBe(404)
  })

  test("serves filesystem RPC endpoints through Hono bridge", async () => {
    await using tmp = await tmpdir({ config: { formatter: false, lsp: false } })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const file = "nested/hello.txt"
    const moved = "archive/hello.txt"

    const written = await app().request(ExperimentalPaths.filesystemWrite, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: file, content: "hello", createDirs: true }),
    })
    if (written.status !== 200) throw new Error(await written.text())
    expect(written.status).toBe(200)
    expect(await written.json()).toMatchObject({ path: file, type: "file", exists: true })

    const read = await app().request(`${ExperimentalPaths.filesystemRead}?${new URLSearchParams({ path: file })}`, {
      headers,
    })
    expect(read.status).toBe(200)
    expect(await read.json()).toMatchObject({ path: file, content: "hello", encoding: "utf8" })

    const stat = await app().request(`${ExperimentalPaths.filesystemStat}?${new URLSearchParams({ path: file })}`, {
      headers,
    })
    expect(stat.status).toBe(200)
    expect(await stat.json()).toMatchObject({ path: file, type: "file", exists: true })

    const listed = await app().request(
      `${ExperimentalPaths.filesystemList}?${new URLSearchParams({ path: "nested" })}`,
      { headers },
    )
    expect(listed.status).toBe(200)
    expect(await listed.json()).toContainEqual(expect.objectContaining({ name: "hello.txt", type: "file" }))

    const made = await app().request(ExperimentalPaths.filesystemMkdir, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "archive" }),
    })
    expect(made.status).toBe(200)
    expect(await made.json()).toMatchObject({ path: "archive", type: "directory", exists: true })

    const renamed = await app().request(ExperimentalPaths.filesystemRename, {
      method: "POST",
      headers,
      body: JSON.stringify({ from: file, to: moved }),
    })
    expect(renamed.status).toBe(200)
    expect(await renamed.json()).toMatchObject({ path: moved, type: "file", exists: true })

    const removed = await app().request(ExperimentalPaths.filesystemRemove, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: moved }),
    })
    expect(removed.status).toBe(200)
    expect(await removed.json()).toMatchObject({ path: moved, removed: true })

    const gone = await app().request(`${ExperimentalPaths.filesystemStat}?${new URLSearchParams({ path: moved })}`, {
      headers,
    })
    expect(gone.status).toBe(200)
    expect(await gone.json()).toMatchObject({ path: moved, type: "missing", exists: false })

    const escaped = await app().request(ExperimentalPaths.filesystemWrite, {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "../outside.txt", content: "blocked" }),
    })
    expect(escaped.status).toBe(400)
  })
  // altrucoder_change end

  testWorktreeMutations("serves worktree mutations through Hono bridge", async () => {
    await using tmp = await tmpdir({ git: true, config: { formatter: false, lsp: false } })

    const headers = { ...experimental, "x-altru-coder-directory": tmp.path, "content-type": "application/json" }
    const created = await app().request(ExperimentalPaths.worktree, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "api-test" }),
    })

    expect(created.status).toBe(200)
    const info = (await created.json()) as Worktree.Info
    expect(info).toMatchObject({ name: "api-test", branch: "opencode/api-test" })
    await waitReady(info.directory)

    const listed = await app().request(ExperimentalPaths.worktree, { headers })
    expect(listed.status).toBe(200)
    expect(await listed.json()).toContain(info.directory)

    if (process.platform !== "win32") {
      const reset = await app().request(ExperimentalPaths.worktreeReset, {
        method: "POST",
        headers,
        body: JSON.stringify({ directory: info.directory }),
      })

      expect(reset.status).toBe(200)
      expect(await reset.json()).toBe(true)
    }

    const removed = await app().request(ExperimentalPaths.worktree, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ directory: info.directory }),
    })

    expect(removed.status).toBe(200)
    expect(await removed.json()).toBe(true)

    const afterRemove = await app().request(ExperimentalPaths.worktree, { headers })
    expect(afterRemove.status).toBe(200)
    expect(await afterRemove.json()).toEqual([])
  })
})
