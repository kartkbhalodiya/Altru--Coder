// altrucoder_change - new file
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import { Global } from "@opencode-ai/core/global"
import * as Log from "@opencode-ai/core/util/log"

const log = Log.create({ service: "altrucoder-memory" })
const MAX_RECORDS = 200
const DEFAULT_LIMIT = 12
const SUMMARY_NAME = "summary.md"
const RAW_NAME = "raw_memories.md"
const SECRET_TEXT = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bnvapi-[A-Za-z0-9_-]{12,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{12,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(api[-_]?key|authorization|cookie|password|secret|token)\s*[:=]\s*["']?[^"',\s;]+/gi,
]

export namespace AltruCoderMemory {
  export type Kind = "project" | "preference" | "decision" | "fact" | "summary"

  export interface Citation {
    sessionID: string
    messageID?: string
    callID?: string
  }

  export interface Record {
    id: string
    kind: Kind
    text: string
    created: number
    updated: number
    citations: Citation[]
  }

  export interface Input {
    projectID: string
    text: string
    kind?: Kind
    citation: Citation
  }

  function dir(projectID: string) {
    return path.join(Global.Path.data, "memory", encodeURIComponent(projectID))
  }

  function file(projectID: string) {
    return path.join(dir(projectID), "records.jsonl")
  }

  function summaryFile(projectID: string) {
    return path.join(dir(projectID), SUMMARY_NAME)
  }

  function rawFile(projectID: string) {
    return path.join(dir(projectID), RAW_NAME)
  }

  function key(projectID: string, text: string) {
    return crypto.createHash("sha256").update(`${projectID}:${normalize(text)}`).digest("hex").slice(0, 16)
  }

  function normalize(text: string) {
    return text.trim().replace(/\s+/g, " ").toLowerCase()
  }

  export function scrub(text: string) {
    return SECRET_TEXT.reduce(
      (next, rule) =>
        next.replace(rule, (_match, key: string | undefined) => (key ? `${key}=[redacted]` : "[redacted]")),
      text,
    )
  }

  function cite(citation: Citation) {
    return `${citation.sessionID}:${citation.messageID ?? ""}:${citation.callID ?? ""}`
  }

  function decode(line: string) {
    try {
      const data = JSON.parse(line) as Record
      if (!data.id || !data.text) return
      return { ...data, text: scrub(data.text) }
    } catch (err) {
      log.warn("ignored invalid memory record", { err })
      return
    }
  }

  async function text(projectID: string) {
    return fs.readFile(file(projectID), "utf8").catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return ""
      log.warn("failed to read project memory", { err })
      return ""
    })
  }

  async function save(projectID: string, records: Record[]) {
    await fs.mkdir(dir(projectID), { recursive: true })
    await fs.writeFile(file(projectID), records.map((record) => JSON.stringify(record)).join("\n") + "\n")
  }

  export async function all(projectID: string) {
    const raw = await text(projectID)
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(decode)
      .filter((record): record is Record => !!record)
      .toSorted((a, b) => b.updated - a.updated)
  }

  export async function remember(input: Input) {
    const value = scrub(input.text).trim()
    if (!value) throw new Error("Memory text is required")

    const now = Date.now()
    const records = await all(input.projectID)
    const id = key(input.projectID, value)
    const hit = records.find((record) => record.id === id)
    const citations = [
      ...new Map([input.citation, ...(hit?.citations ?? [])].map((citation) => [cite(citation), citation])).values(),
    ].slice(0, 8)
    const next: Record = hit
      ? {
          ...hit,
          kind: input.kind ?? hit.kind,
          text: value,
          updated: now,
          citations,
        }
      : {
          id,
          kind: input.kind ?? "project",
          text: value,
          created: now,
          updated: now,
          citations: [input.citation],
        }
    const merged = [next, ...records.filter((record) => record.id !== id)].slice(0, MAX_RECORDS)
    await save(input.projectID, merged)
    return next
  }

  export function summarize(records: Record[], limit = 50) {
    const unique = records
      .toSorted((a, b) => b.updated - a.updated)
      .slice(0, limit)
      .reduce<Record[]>((all, record) => {
        const text = scrub(record.text).trim()
        if (!text) return all
        if (all.some((item) => normalize(item.text) === normalize(text))) return all
        return [...all, { ...record, text }]
      }, [])

    if (unique.length === 0) return "No durable project memory to summarize yet."

    const sections: [Kind, string][] = [
      ["decision", "Decisions"],
      ["preference", "Preferences"],
      ["fact", "Facts"],
      ["project", "Project Context"],
      ["summary", "Prior Summaries"],
    ]
    const lines = sections.flatMap(([kind, title]) => {
      const items = unique.filter((record) => record.kind === kind).slice(0, 12)
      if (items.length === 0) return []
      return [`## ${title}`, ...items.map((record) => `- ${record.text}`), ""]
    })
    return ["# Altru Coder Project Memory", "", ...lines].join("\n").trim()
  }

  export async function consolidate(projectID: string, limit = 50) {
    const records = (await all(projectID)).slice(0, limit)
    const summary = summarize(records, limit)
    const raw = format(records)
    await fs.mkdir(dir(projectID), { recursive: true })
    await Promise.all([
      fs.writeFile(summaryFile(projectID), [`Generated: ${new Date().toISOString()}`, "", summary, ""].join("\n")),
      fs.writeFile(rawFile(projectID), [`# Raw Altru Coder Memories`, "", raw, ""].join("\n")),
    ])
    return {
      count: records.length,
      summary,
      summaryPath: summaryFile(projectID),
      rawPath: rawFile(projectID),
    }
  }

  export async function search(projectID: string, query: string, limit = DEFAULT_LIMIT) {
    const needle = normalize(query)
    if (!needle) return (await all(projectID)).slice(0, limit)
    return (await all(projectID)).filter((record) => normalize(record.text).includes(needle)).slice(0, limit)
  }

  export function format(records: Record[]) {
    if (records.length === 0) return "No project memories are stored yet."
    return records
      .map((record) => {
        const citation = record.citations[0]
        const source = citation
          ? `source=session:${citation.sessionID}${citation.messageID ? `/message:${citation.messageID}` : ""}`
          : "source=unknown"
        return `- [${record.kind}] ${scrub(record.text)} (${source})`
      })
      .join("\n")
  }

  export async function system(projectID: string, limit = DEFAULT_LIMIT) {
    const records = (await all(projectID)).slice(0, limit)
    const summary = await fs.readFile(summaryFile(projectID), "utf8").catch((err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") return ""
      log.warn("failed to read project memory summary", { err })
      return ""
    })
    const guide = [
      "<system-reminder>",
      "Altru Coder project memory is available through the altru_coder_memory tool.",
      "Store only durable facts, user preferences, project decisions, API/provider setup, and non-obvious fixes.",
      "Do not store secrets, one-off commands, transient errors, or private text unrelated to this workspace.",
      "</system-reminder>",
    ].join("\n")

    if (records.length === 0 && !summary.trim()) return guide
    return [
      guide,
      summary.trim()
        ? [
            "<altru_memory_summary>",
            "Use this consolidated project memory as durable context. Verify against files when correctness matters.",
            summary.trim(),
            "</altru_memory_summary>",
          ].join("\n")
        : undefined,
      records.length > 0
        ? [
            "<altru_memory>",
            "Recent project memories:",
            format(records),
            "</altru_memory>",
          ].join("\n")
        : undefined,
    ]
      .filter(Boolean)
      .join("\n\n")
  }
}
