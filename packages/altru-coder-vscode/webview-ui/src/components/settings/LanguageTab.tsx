import { Component } from "solid-js"
import { Select } from "@altru-coder/altru-coder-ui/select"
import { useLanguage, LOCALES, LOCALE_LABELS, type Locale } from "../../context/language"

const AUTO = "auto"
const options = [AUTO, ...LOCALES] as const
type Option = typeof AUTO | Locale

const LanguageTab: Component = () => {
  const language = useLanguage()
  const current = () => language.userOverride() || AUTO

  return (
    <div style={{ padding: "16px" }}>
      <p style={{ "font-size": "var(--altru-coder-font-size-13)", "margin-bottom": "12px" }}>
        {language.t("settings.language.description")}
      </p>
      <Select
        options={[...options]}
        current={current()}
        label={(opt: Option) => (opt === AUTO ? language.t("settings.language.auto") : LOCALE_LABELS[opt])}
        value={(opt: Option) => opt}
        onSelect={(opt) => {
          if (opt !== undefined) {
            language.setLocale(opt === AUTO ? "" : (opt as Locale))
          }
        }}
        variant="secondary"
        size="large"
      />
      <p
        style={{
          "font-size": "var(--altru-coder-font-size-12)",
          color: "var(--vscode-descriptionForeground)",
          "margin-top": "8px",
        }}
      >
        {language.t("settings.language.current")} {LOCALE_LABELS[language.locale()]}
      </p>
    </div>
  )
}

export default LanguageTab
