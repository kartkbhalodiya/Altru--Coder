// AltruCoderClaw setup view — shown when no instance is provisioned

import { Button } from "@altru-coder/altru-coder-ui/button"
import { Card, CardTitle, CardDescription, CardActions } from "@altru-coder/altru-coder-ui/card"
import { useClaw } from "../context/claw"
import { useAltruCoderClawLanguage } from "../context/language"

export function SetupView() {
  const claw = useClaw()
  const { t } = useAltruCoderClawLanguage()

  return (
    <div class="altru-coder-claw-center">
      <Card class="altru-coder-claw-card">
        <CardTitle icon={false}>{t("altruClaw.setup.title")}</CardTitle>
        <CardDescription>
          <h3 class="altru-coder-claw-card-subtitle">{t("altruClaw.setup.subtitle")}</h3>
          <p class="altru-coder-claw-card-text">{t("altruClaw.setup.description1")}</p>
          <p class="altru-coder-claw-card-text">{t("altruClaw.setup.description2")}</p>
        </CardDescription>
        <CardActions>
          <Button variant="ghost" onClick={() => claw.openExternal("https://altru-coder.ai/altru-coder-claw")}>
            {t("altruClaw.setup.learnMore")}
          </Button>
          <Button variant="primary" onClick={() => claw.openExternal("https://app.altru-coder.ai/claw")}>
            {t("altruClaw.setup.tryAltruCoderClaw")}
          </Button>
        </CardActions>
      </Card>
    </div>
  )
}
