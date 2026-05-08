import * as path from "path"
import * as os from "os"

/**
 * Global config dir: ~/.config/altru-coder/ (XDG_CONFIG_HOME/altru)
 * This matches where the CLI reads global config from.
 */
function globalConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  return path.join(xdg, "altru-coder")
}

export class MarketplacePaths {
  /** Project-scope config file: <workspace>/.altru-coder/altru-coder.json */
  configPath(scope: "project" | "global", workspace?: string): string {
    if (scope === "project") return path.join(workspace!, ".altru-coder", "altru-coder.json")
    return path.join(globalConfigDir(), "altru-coder.json")
  }

  /** Skill install directory (where the marketplace installer writes to). */
  skillsDir(scope: "project" | "global", workspace?: string): string {
    if (scope === "project") return path.join(workspace!, ".altru-coder", "skills")
    return path.join(os.homedir(), ".altru-coder", "skills")
  }
}
