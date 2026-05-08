import HomeFooter from "../feature-plugins/home/footer"
import HomeTips from "../feature-plugins/home/tips"
// altrucoder_change start
import HomeNews from "@/altrucoder/plugins/home-news"
import HomeOnboarding from "@/altrucoder/plugins/home-onboarding"
import AltruCoderHomeFooter from "@/altrucoder/plugins/home-footer"
import AltruCoderSidebarFooter from "@/altrucoder/plugins/sidebar-footer"
import AltruCoderSidebarPr from "@/altrucoder/plugins/sidebar-pr"
import AltruCoderSidebarUsage from "@/altrucoder/plugins/sidebar-usage"
// altrucoder_change end
import SidebarContext from "../feature-plugins/sidebar/context"
import SidebarMcp from "../feature-plugins/sidebar/mcp"
import SidebarLsp from "../feature-plugins/sidebar/lsp"
import SidebarTodo from "../feature-plugins/sidebar/todo"
import SidebarFiles from "../feature-plugins/sidebar/files"
import SidebarFooter from "../feature-plugins/sidebar/footer"
import PluginManager from "../feature-plugins/system/plugins"
import type { TuiPlugin, TuiPluginModule } from "@altru-coder/plugin/tui"

export type InternalTuiPlugin = TuiPluginModule & {
  id: string
  tui: TuiPlugin
}

export const INTERNAL_TUI_PLUGINS: InternalTuiPlugin[] = [
  HomeNews, // altrucoder_change
  HomeOnboarding, // altrucoder_change
  AltruCoderHomeFooter, // altrucoder_change
  AltruCoderSidebarFooter, // altrucoder_change
  AltruCoderSidebarPr, // altrucoder_change
  AltruCoderSidebarUsage, // altrucoder_change
  HomeFooter,
  HomeTips,
  SidebarContext,
  SidebarMcp,
  SidebarLsp,
  SidebarTodo,
  SidebarFiles,
  SidebarFooter,
  PluginManager,
]
