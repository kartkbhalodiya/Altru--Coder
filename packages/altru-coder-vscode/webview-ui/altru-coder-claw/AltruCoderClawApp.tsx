// AltruCoderClaw root component

import { Switch, Match } from "solid-js"
import { ThemeProvider } from "@altru-coder/altru-coder-ui/theme"
import { MarkedProvider } from "@altru-coder/altru-coder-ui/context/marked"
import { Button } from "@altru-coder/altru-coder-ui/button"
import { Spinner } from "@altru-coder/altru-coder-ui/spinner"
import { Toast } from "@altru-coder/altru-coder-ui/toast"
import { ClawProvider, useClaw } from "./context/claw"
import { AltruCoderClawLanguageProvider, useAltruCoderClawLanguage } from "./context/language"
import { ConversationList } from "./components/ConversationList"
import { MessageArea } from "./components/MessageArea"
import { StatusSidebar } from "./components/StatusSidebar"
import { SetupView } from "./components/SetupView"
import { UpgradeView } from "./components/UpgradeView"

function Content() {
  const claw = useClaw()
  const { t } = useAltruCoderClawLanguage()

  return (
    <div class="altru-coder-claw-root">
      <Switch>
        <Match when={claw.phase() === "loading"}>
          <div class="altru-coder-claw-center">
            <div class="altru-coder-claw-loading">
              <Spinner />
              <span>{t("altruClaw.loading")}</span>
            </div>
          </div>
        </Match>
        <Match when={claw.phase() === "noInstance"}>
          <SetupView />
        </Match>
        <Match when={claw.phase() === "needsUpgrade"}>
          <UpgradeView />
        </Match>
        <Match when={claw.phase() === "error"}>
          <div class="altru-coder-claw-center">
            <div class="altru-coder-claw-error-view">
              <span class="altru-coder-claw-error-text">{claw.error()}</span>
              <Button variant="primary" onClick={() => claw.retry()}>
                {t("altruClaw.error.retry")}
              </Button>
            </div>
          </div>
        </Match>
        <Match when={claw.phase() === "ready"}>
          <div class="altru-coder-claw-layout">
            <ConversationList />
            <MessageArea />
            <StatusSidebar />
          </div>
        </Match>
      </Switch>
      <Toast.Region />
    </div>
  )
}

export function AltruCoderClawApp() {
  return (
    <ThemeProvider defaultTheme="altru-coder-vscode">
      <ClawProvider>
        <LanguageBridge>
          <MarkedProvider>
            <Content />
          </MarkedProvider>
        </LanguageBridge>
      </ClawProvider>
    </ThemeProvider>
  )
}

/** Bridges the claw context locale into the language provider. Must be below ClawProvider. */
function LanguageBridge(props: { children: any }) {
  const claw = useClaw()
  return <AltruCoderClawLanguageProvider locale={claw.locale}>{props.children}</AltruCoderClawLanguageProvider>
}
