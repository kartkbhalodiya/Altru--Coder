import fs from "node:fs"

const BASE_URL = "https://integrate.api.nvidia.com/v1"
const OUT_FILE = "nvidia-nim-benchmark-output.txt"
const STEP_CHUNKS = Number(process.env.STEP_CHUNKS || "25")
const LIMIT = Number(process.env.LIMIT || "0")
const MODEL_FILTER = process.env.MODEL_FILTER || ""
const MODE = process.env.MODE || "both"
const MAX_TOKENS = Number(process.env.MAX_TOKENS || "4096")
const API_KEY = process.env.NVIDIA_API_KEY

const PROMPT =
  process.env.PROMPT ||
  "Generate a premium high-end liquid glass login page in one complete HTML file. Include HTML, CSS, and JavaScript. Use a modern glassmorphism layout, animated liquid background, email/password fields, remember me, validation, and polished responsive design."

if (!API_KEY) {
  console.error("Missing NVIDIA_API_KEY environment variable.")
  process.exit(1)
}

function write(text) {
  fs.appendFileSync(OUT_FILE, text, "utf8")
}

function fmt(value) {
  return value === undefined || Number.isNaN(value) ? "n/a" : value.toFixed(2)
}

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    ...extra,
  }
}

async function getModels() {
  const res = await fetch(`${BASE_URL}/models`, { headers: headers() })
  if (!res.ok) throw new Error(`Fetch models failed ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const list = Array.isArray(json.data) ? json.data : []
  const ids = list.map((item) => item.id).filter(Boolean).sort()
  const filtered = MODEL_FILTER ? ids.filter((id) => id.toLowerCase().includes(MODEL_FILTER.toLowerCase())) : ids
  return LIMIT > 0 ? filtered.slice(0, LIMIT) : filtered
}

function parseSse(line) {
  if (!line.startsWith("data:")) return undefined
  const data = line.slice(5).trim()
  if (data === "[DONE]") return { done: true }
  try {
    return JSON.parse(data)
  } catch {
    return undefined
  }
}

async function runModel(model, reasoning) {
  const payload = {
    model,
    messages: [{ role: "user", content: PROMPT }],
    max_tokens: MAX_TOKENS,
    temperature: 1,
    top_p: 1,
    stream: true,
  }
  if (reasoning) payload.chat_template_kwargs = { thinking: true }

  const started = performance.now()
  let first
  let finished
  let chunks = 0
  let content = ""
  let thinking = ""
  const steps = []

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: headers({
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return {
        model,
        mode: reasoning ? "reasoning" : "normal",
        status: res.status,
        error: await res.text(),
      }
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const item = await reader.read()
      if (item.done) break
      if (!first) first = performance.now()

      buffer += decoder.decode(item.value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ""

      for (const raw of lines) {
        const msg = parseSse(raw.trim())
        if (!msg) continue
        if (msg.done) {
          finished = performance.now()
          break
        }

        const delta = msg.choices?.[0]?.delta || {}
        content += delta.content || ""
        thinking += delta.reasoning_content || delta.reasoning || ""
        chunks += 1

        if (chunks === 1 || chunks % STEP_CHUNKS === 0) {
          const now = performance.now()
          const chars = content.length + thinking.length
          steps.push({
            chunk: chunks,
            sec: (now - started) / 1000,
            chars,
            tokens: chars / 4,
            content: content.length,
            thinking: thinking.length,
          })
        }
      }
    }
  } catch (error) {
    return {
      model,
      mode: reasoning ? "reasoning" : "normal",
      status: "exception",
      error: error instanceof Error ? error.stack || error.message : String(error),
    }
  }

  finished = finished || performance.now()
  const total = (finished - started) / 1000
  const ttft = first ? (first - started) / 1000 : undefined
  const chars = content.length + thinking.length
  const tokens = chars / 4
  const speed = first && finished > first ? tokens / ((finished - first) / 1000) : undefined

  return {
    model,
    mode: reasoning ? "reasoning" : "normal",
    status: 200,
    ttft,
    total,
    chunks,
    tokens,
    speed,
    content,
    thinking,
    steps,
  }
}

function saveResult(result) {
  write("\n============================================================\n")
  write(`MODEL: ${result.model}\n`)
  write(`MODE: ${result.mode}\n`)
  write(`STATUS: ${result.status}\n`)
  write(`TTFT_SEC: ${fmt(result.ttft)}\n`)
  write(`TOTAL_SEC: ${fmt(result.total)}\n`)
  write(`CHUNKS: ${result.chunks || 0}\n`)
  write(`APPROX_TOKENS: ${fmt(result.tokens)}\n`)
  write(`APPROX_TOKENS_PER_SEC_AFTER_FIRST: ${fmt(result.speed)}\n`)

  if (result.steps?.length) {
    write("\n--- TOKEN STEPS ---\n")
    for (const step of result.steps) {
      write(
        `chunk=${step.chunk} sec=${fmt(step.sec)} approx_tokens=${fmt(step.tokens)} chars=${step.chars} content_chars=${step.content} reasoning_chars=${step.thinking}\n`,
      )
    }
  }

  if (result.error) {
    write("\n--- ERROR ---\n")
    write(`${result.error}\n`)
  }

  if (result.thinking) {
    write("\n--- REASONING OUTPUT ---\n")
    write(`${result.thinking}\n`)
  }

  if (result.content) {
    write("\n--- FINAL OUTPUT ---\n")
    write(`${result.content}\n`)
  }
}

async function main() {
  fs.writeFileSync(
    OUT_FILE,
    [
      "NVIDIA NIM ALL MODEL BENCHMARK",
      `Created: ${new Date().toISOString()}`,
      `Mode: ${MODE}`,
      `Limit: ${LIMIT || "all"}`,
      `Model filter: ${MODEL_FILTER || "none"}`,
      `Step chunks: ${STEP_CHUNKS}`,
      `Max tokens: ${MAX_TOKENS}`,
      `Prompt: ${PROMPT}`,
      "",
    ].join("\n"),
    "utf8",
  )

  const models = await getModels()
  write(`Fetched models: ${models.length}\n`)

  const cases = MODE === "normal" ? [false] : MODE === "reasoning" ? [true] : [false, true]

  for (const model of models) {
    for (const reasoning of cases) {
      const label = reasoning ? "reasoning" : "normal"
      console.log(`Running ${model} ${label}`)
      write(`\nSTART ${model} ${label} ${new Date().toISOString()}\n`)
      const result = await runModel(model, reasoning)
      saveResult(result)
      console.log(
        `${model} ${label}: status=${result.status} ttft=${fmt(result.ttft)}s total=${fmt(result.total)}s speed=${fmt(result.speed)} tok/s`,
      )
    }
  }

  console.log(`Done. Saved: ${OUT_FILE}`)
}

main().catch((error) => {
  write(`\nFATAL ERROR:\n${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  console.error(error)
  process.exit(1)
})
