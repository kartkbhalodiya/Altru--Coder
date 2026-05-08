import { createMemo, Match, Switch, type JSX } from "solid-js"
import { SplitBorder } from "@tui/component/border"
import { useTheme } from "@tui/context/theme"
import { parseAltruCoderErrorCode, altruErrorTitle, altruErrorDescription } from "@/altrucoder/altru-coder-errors"
import type { AssistantMessage } from "@altru-coder/sdk/v2"

interface AltruCoderErrorBlockProps {
  error: NonNullable<AssistantMessage["error"]>
  fallback: JSX.Element
}

export function AltruCoderErrorBlock(props: AltruCoderErrorBlockProps) {
  const { theme } = useTheme()

  const altruErrorCode = createMemo(() => {
    return parseAltruCoderErrorCode(props.error)
  })

  const title = createMemo(() => {
    const code = altruErrorCode()
    return code ? altruErrorTitle(code) : undefined
  })

  const description = createMemo(() => {
    const code = altruErrorCode()
    return code ? altruErrorDescription(code) : undefined
  })

  return (
    <Switch fallback={props.fallback}>
      <Match when={altruErrorCode()}>
        <box
          border={["left"]}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          marginTop={1}
          backgroundColor={theme.backgroundPanel}
          customBorderChars={SplitBorder.customBorderChars}
          borderColor={theme.primary}
        >
          <text fg={theme.text}>{title()}</text>
          <text fg={theme.textMuted}>{description()}</text>
          <text fg={theme.primary}>{"Run /connect or `altru-coder auth login` to connect to Altru Coder Gateway"}</text>
        </box>
      </Match>
    </Switch>
  )
}
