import { For, type JSX } from "solid-js"
import { useData } from "../context"

type Segment =
  | {
      kind: "text"
      text: string
    }
  | {
      kind: "link"
      text: string
    }

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]]+/g

function safe(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch (err) {
    void err
    return false
  }
}

function split(text: string): Segment[] {
  const parts: Segment[] = []
  let index = 0

  for (const item of text.matchAll(URL_PATTERN)) {
    const raw = item[0]
    const start = item.index ?? 0
    const link = raw.replace(/[),.;:!?]+$/g, "")
    const trail = raw.slice(link.length)
    if (!link || !safe(link)) continue
    if (start > index) parts.push({ kind: "text", text: text.slice(index, start) })
    parts.push({ kind: "link", text: link })
    if (trail) parts.push({ kind: "text", text: trail })
    index = start + raw.length
  }

  if (index < text.length) parts.push({ kind: "text", text: text.slice(index) })
  return parts.length > 0 ? parts : [{ kind: "text", text }]
}

export function ShellLinkText(props: { text: string; slot?: string }): JSX.Element {
  const data = useData()

  const open = (url: string, event: MouseEvent) => {
    event.stopPropagation()
    const handler = data.openUrl
    if (!handler) return
    event.preventDefault()
    handler(url)
  }

  return (
    <span data-slot={props.slot}>
      <For each={split(props.text)}>
        {(part) =>
          part.kind === "link" ? (
            <a
              data-slot="shell-output-link"
              href={part.text}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => open(part.text, event)}
            >
              {part.text}
            </a>
          ) : (
            part.text
          )
        }
      </For>
    </span>
  )
}
