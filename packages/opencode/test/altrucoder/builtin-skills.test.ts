import { afterEach, test, expect } from "bun:test"
import path from "path"
import { Skill } from "../../src/skill"
import { Instance } from "../../src/project/instance"
import { BUILTIN_SKILLS } from "../../src/altrucoder/skills/builtin"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await disposeAllInstances()
})

test(
  "built-in skills are present in empty project",
  async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const skills = await Skill.all()
        for (const builtin of BUILTIN_SKILLS) {
          const found = skills.find((s) => s.name === builtin.name)
          expect(found).toBeDefined()
          expect(found!.location).toBe(Skill.BUILTIN_LOCATION)
          expect(found!.description).toBe(builtin.description)
          expect(found!.content.length).toBeGreaterThan(0)
        }
      },
    })
  },
  { timeout: 30_000 },
)

test("built-in skill has correct metadata", async () => {
  await using tmp = await tmpdir({ git: true })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("altru-coder-config")
      expect(skill).toBeDefined()
      expect(skill!.name).toBe("altru-coder-config")
      expect(skill!.location).toBe(Skill.BUILTIN_LOCATION)
      expect(skill!.content).toContain("altru-coder")
    },
  })
})

test("ui ux pro max ships router and narrow skills", async () => {
  await using tmp = await tmpdir({ git: true })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const router = await Skill.get("ui-ux-pro-max")
      const ui = await Skill.get("ckm:ui-styling")
      const full = await Skill.get("ui-ux-pro-max-full")

      expect(router).toBeDefined()
      expect(router!.content).toContain("Do not load the full guide by default")
      expect(router!.content).toContain("ckm:ui-styling")
      expect(ui).toBeDefined()
      expect(ui!.content).toContain("shadcn/ui")
      expect(full).toBeDefined()
      expect(full!.content).toContain("UI/UX Pro Max - Design Intelligence")
    },
  })
})

test("user skill overrides built-in with same name", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".altru-coder", "skill", "altru-coder-config")
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---
name: altru-coder-config
description: User override of altru-coder-config.
---

# Custom altru-coder-config

User-provided content.
`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skill = await Skill.get("altru-coder-config")
      expect(skill).toBeDefined()
      expect(skill!.description).toBe("User override of altru-coder-config.")
      expect(skill!.location).not.toBe(Skill.BUILTIN_LOCATION)
      expect(skill!.location).toContain(path.join("skill", "altru-coder-config", "SKILL.md"))
    },
  })
})
