import path from "path"
import { MessageID, SessionID } from "@/session/schema"
import { Shell } from "@/shell/shell"
import { BashBackground } from "@/tool/bash"
import * as Truncate from "@/tool/truncate"

export namespace ProcessRpc {
  export const limits = { maxLines: Truncate.MAX_LINES, maxBytes: Truncate.MAX_BYTES }

  export type Start = {
    sessionID: SessionID
    command: string
    cwd: string
    shell: string
    env?: Record<string, string>
    messageID?: MessageID
    callID?: string
  }

  export type Info = BashBackground.Snapshot & {
    processID: string
  }

  export type Output = BashBackground.Output & {
    processID: string
  }

  export function session(value?: string) {
    return value ? SessionID.make(value) : undefined
  }

  export function directory(root: string, cwd?: string) {
    return cwd ? path.resolve(root, cwd) : root
  }

  export function shell(value?: string, fallback?: string) {
    return Shell.acceptable(value ?? fallback)
  }

  export function info(input: BashBackground.Snapshot): Info {
    return {
      processID: input.id,
      ...input,
    }
  }

  export function output(input: BashBackground.Output): Output {
    return {
      processID: input.id,
      ...input,
    }
  }

  export function start(input: Start) {
    const env = input.env ? { ...process.env, ...input.env } : process.env
    return info(
      BashBackground.start(
        {
          command: input.command,
          cwd: input.cwd,
          shell: input.shell,
          env,
          sessionID: input.sessionID,
          messageID: input.messageID,
          callID: input.callID,
        },
        limits,
      ),
    )
  }

  export function list(sessionID?: SessionID) {
    return BashBackground.list(limits, sessionID).map(info)
  }

  export function read(processID: string, sessionID?: SessionID) {
    return info(BashBackground.read(processID, limits, sessionID))
  }

  export function poll(processID: string, offset: number, sessionID?: SessionID) {
    return output(BashBackground.output(processID, offset, sessionID))
  }

  export async function write(processID: string, input: string, sessionID?: SessionID) {
    return info(await BashBackground.write(processID, input, limits, sessionID))
  }

  export async function stop(processID: string, sessionID?: SessionID) {
    return info(await BashBackground.stop(processID, limits, sessionID))
  }

  export async function clean(sessionID?: SessionID) {
    return (await BashBackground.clean(limits, sessionID)).map(info)
  }
}
