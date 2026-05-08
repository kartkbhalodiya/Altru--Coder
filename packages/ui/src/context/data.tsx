import type { Message, Session, Part, SnapshotFileDiff, SessionStatus, ProviderListResponse } from "@altru-coder/sdk/v2"
import { createSimpleContext } from "./helper"
import { PreloadMultiFileDiffResult } from "@pierre/diffs/ssr"

type Data = {
  agent?: {
    name: string
    color?: string
  }[]
  provider?: ProviderListResponse
  session: Session[]
  session_status: {
    [sessionID: string]: SessionStatus
  }
  session_diff: {
    [sessionID: string]: SnapshotFileDiff[]
  }
  session_diff_preload?: {
    [sessionID: string]: PreloadMultiFileDiffResult<any>[]
  }
  message: {
    [sessionID: string]: Message[]
  }
  part: {
    [messageID: string]: Part[]
  }
}

export type NavigateToSessionFn = (sessionID: string) => void

export type SessionHrefFn = (sessionID: string) => string

// altrucoder_change start
export type OpenFileFn = (filePath: string, line?: number, column?: number) => void

export type OpenDiffFn = (diff: {
  file: string
  before?: string // altrucoder_change - optional, altru-coder uses `patch`
  after?: string // altrucoder_change - optional, altru-coder uses `patch`
  patch?: string // altrucoder_change
  additions: number
  deletions: number
}) => void

export type OpenUrlFn = (url: string) => void
// altrucoder_change end

export const { use: useData, provider: DataProvider } = createSimpleContext({
  name: "Data",
  init: (props: {
    data: Data
    directory: string
    onNavigateToSession?: NavigateToSessionFn
    onSessionHref?: SessionHrefFn
    onOpenFile?: OpenFileFn // altrucoder_change
    onOpenDiff?: OpenDiffFn // altrucoder_change
    onOpenUrl?: OpenUrlFn // altrucoder_change
  }) => {
    return {
      get store() {
        return props.data
      },
      get directory() {
        return props.directory
      },
      navigateToSession: props.onNavigateToSession,
      sessionHref: props.onSessionHref,
      openFile: props.onOpenFile, // altrucoder_change
      openDiff: props.onOpenDiff, // altrucoder_change
      openUrl: props.onOpenUrl, // altrucoder_change
    }
  },
})
