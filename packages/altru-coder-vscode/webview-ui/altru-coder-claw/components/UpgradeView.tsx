// AltruCoderClaw upgrade view — shown when instance needs upgrade for chat

import { Button } from "@altru-coder/altru-coder-ui/button"
import { Card, CardTitle, CardDescription, CardActions } from "@altru-coder/altru-coder-ui/card"
import { useClaw } from "../context/claw"
import { useAltruCoderClawLanguage } from "../context/language"

export function UpgradeView() {
  const claw = useClaw()
  const { t } = useAltruCoderClawLanguage()

  return (
    <div class="altru-coder-claw-center">
      <Card class="altru-coder-claw-card">
        <CardTitle icon={false}>{t("altruClaw.upgrade.title")}</CardTitle>
        <CardDescription>
          <p class="altru-coder-claw-card-text">{t("altruClaw.upgrade.description1")}</p>
          <p class="altru-coder-claw-card-text">
            {t("altruClaw.upgrade.description2.before")}
            <strong>{t("altruClaw.upgrade.description2.bold")}</strong>
            {t("altruClaw.upgrade.description2.after")}
          </p>
        </CardDescription>
        <CardActions>
          <div />
          <Button variant="primary" onClick={() => claw.openExternal("https://altrucoder.vercel.app/login.html")}>
            {t("altruClaw.upgrade.openDashboard")}
          </Button>
        </CardActions>
      </Card>
    </div>
  )
}
