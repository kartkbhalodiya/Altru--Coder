import type { Component } from "solid-js"
import { Dialog } from "@altru-coder/altru-coder-ui/dialog"
import { Button } from "@altru-coder/altru-coder-ui/button"
import { useDialog } from "@altru-coder/altru-coder-ui/context/dialog"
import { useLanguage } from "../../context/language"

interface ForceReimportDialogProps {
  count: number
  onConfirm: () => void
}

const ForceReimportDialog: Component<ForceReimportDialogProps> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()

  return (
    <Dialog title={language.t("migration.forceReimport.title")} fit>
      <div class="dialog-confirm-body">
        <p>
          {language.t("migration.forceReimport.description", {
            target:
              props.count === 1
                ? language.t("migration.forceReimport.target.one")
                : language.t("migration.forceReimport.target.many", { count: String(props.count) }),
          })}
        </p>
        <div class="dialog-confirm-actions">
          <Button variant="secondary" size="large" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="large"
            onClick={() => {
              props.onConfirm()
              dialog.close()
            }}
          >
            {language.t("migration.forceReimport.proceed")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default ForceReimportDialog
