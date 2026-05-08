import type { DesktopTheme } from "@opencode-ai/ui/theme/types"
import { DEFAULT_THEMES as UPSTREAM_THEMES } from "@opencode-ai/ui/theme/default-themes"
import altruJson from "./themes/altru-coder.json"
import altruVscodeJson from "./themes/altru-coder-vscode.json"

// Re-export all upstream theme constants
export {
  oc2Theme,
  tokyonightTheme,
  draculaTheme,
  monokaiTheme,
  solarizedTheme,
  nordTheme,
  catppuccinTheme,
  ayuTheme,
  oneDarkProTheme,
  shadesOfPurpleTheme,
  nightowlTheme,
  vesperTheme,
  carbonfoxTheme,
  gruvboxTheme,
  auraTheme,
} from "@opencode-ai/ui/theme/default-themes"

export const altruTheme = altruJson as DesktopTheme
export const altruVscodeTheme = altruVscodeJson as DesktopTheme

export const ALTRU_CODER_THEMES: Record<string, DesktopTheme> = {
  "altru-coder": altruTheme,
  "altru-coder-vscode": altruVscodeTheme,
}

// Override DEFAULT_THEMES: Altru Coder themes first, then upstream
export const DEFAULT_THEMES: Record<string, DesktopTheme> = {
  ...ALTRU_CODER_THEMES,
  ...UPSTREAM_THEMES,
}
