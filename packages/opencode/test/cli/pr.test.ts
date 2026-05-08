// altrucoder_change - new file
import { expect, test } from "bun:test"
import { cliCommand } from "../../src/cli/cmd/pr"

test("cliCommand uses the current script when argv[1] is a file path", () => {
  const result = cliCommand({
    execPath: "/usr/bin/node",
    argv: ["/usr/bin/node", "/tmp/altru.js", "pr", "1"],
    exists: (file) => file === "/tmp/altru.js",
  })

  expect(result).toEqual(["/usr/bin/node", "/tmp/altru.js"])
})

test("cliCommand falls back to execPath when argv[1] is a subcommand", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/altru-coder",
    argv: ["/usr/local/bin/altru-coder", "pr", "1"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/altru-coder"])
})

test("cliCommand ignores subcommand token even when it exists on disk", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/altru-coder",
    argv: ["/usr/local/bin/altru-coder", "pr", "1"],
    exists: (file) => file === "pr",
  })

  expect(result).toEqual(["/usr/local/bin/altru-coder"])
})

test("cliCommand falls back to execPath when argv[1] is missing", () => {
  const result = cliCommand({
    execPath: "/usr/local/bin/altru-coder",
    argv: ["/usr/local/bin/altru-coder"],
    exists: () => false,
  })

  expect(result).toEqual(["/usr/local/bin/altru-coder"])
})

test("cliCommand falls back to execPath for bun virtual script paths", () => {
  const unix = cliCommand({
    execPath: "/tmp/altru",
    argv: ["/tmp/altru", "/$bunfs/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  const win = cliCommand({
    execPath: "C:/tmp/altru.exe",
    argv: ["C:/tmp/altru.exe", "B:/~BUN/root/src/index.js", "pr", "1"],
    exists: () => true,
  })

  expect(unix).toEqual(["/tmp/altru"])
  expect(win).toEqual(["C:/tmp/altru.exe"])
})
