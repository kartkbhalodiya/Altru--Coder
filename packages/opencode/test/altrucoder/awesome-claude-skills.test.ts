import { describe, expect, test } from "bun:test"
import { AwesomeSkills } from "../../src/altrucoder/skills/awesome"
import { Skill } from "../../src/skill"
import { Instance } from "../../src/project/instance"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
import { afterEach } from "bun:test"

afterEach(async () => {
  await disposeAllInstances()
})

describe("awesome-claude-skills pack", () => {
  test("indexes bundled metadata without loading bodies", async () => {
    const list = await AwesomeSkills.index()
    const changelog = list.find((skill) => skill.name === "changelog-generator")

    expect(list.length).toBeGreaterThan(800)
    expect(changelog).toBeDefined()
    expect(changelog!.description).toContain("changelogs")
    expect(changelog!.content).toBe("")
  })

  test(
    "lazy loads selected skill content through Skill.get",
    async () => {
      await using tmp = await tmpdir({ git: true })

      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const list = await Skill.all()
          const meta = list.find((skill) => skill.name === "changelog-generator")
          expect(meta).toBeDefined()
          expect(meta!.content).toBe("")

          const skill = await Skill.get("changelog-generator")
          expect(skill).toBeDefined()
          expect(skill!.content).toContain("# Changelog Generator")
        },
      })
    },
    { timeout: 30_000 },
  )
})
