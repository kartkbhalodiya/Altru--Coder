// AltruCoderClaw SolidJS webview entry point

import { render } from "solid-js/web"
import "@altru-coder/altru-coder-ui/styles"
import "./altru-coder-claw.css"
import "../src/styles/glass.css"
import { AltruCoderClawApp } from "./AltruCoderClawApp"

const root = document.getElementById("root")
if (root) {
  render(() => <AltruCoderClawApp />, root)
}
