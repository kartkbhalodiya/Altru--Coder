import React from "react"
import { Icon } from "./Icon"

interface AltruCoderIconProps {
  size?: string
}

export function AltruCoderIcon({ size = "1.2em" }: AltruCoderIconProps) {
  return <Icon src="/docs/img/altru-v1.svg" srcDark="/docs/img/altru-v1-white.svg" alt="Altru Coder Icon" size={size} />
}
