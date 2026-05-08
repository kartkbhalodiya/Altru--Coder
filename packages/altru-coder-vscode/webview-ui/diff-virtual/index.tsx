import { render } from "solid-js/web"
import "@altru-coder/altru-coder-ui/styles"
import "../src/styles/chat.css"
import "../agent-manager/agent-manager.css"
import { DiffVirtualApp } from "./DiffVirtualApp"

const root = document.getElementById("root")
if (root) {
  render(() => <DiffVirtualApp />, root)
}
