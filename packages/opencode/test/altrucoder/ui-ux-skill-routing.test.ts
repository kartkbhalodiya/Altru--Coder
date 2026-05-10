import { describe, expect, test } from "bun:test"
import { nearest } from "../../src/altrucoder/skills/routing"
import { BUILTIN_SKILLS } from "../../src/altrucoder/skills/builtin"

describe("UI/UX skill routing", () => {
  test("frontend prompts expose only nearest UI skills", () => {
    const names = nearest(BUILTIN_SKILLS, "fix the login page dropdown and responsive form").map((skill) => skill.name)

    expect(names.length).toBeLessThanOrEqual(3)
    expect(names).toContain("frontend-design")
    expect(names).toContain("ckm:ui-styling")
    expect(names).not.toContain("ui-ux-pro-max")
    expect(names).not.toContain("ckm:slides")
    expect(names).not.toContain("ckm:banner-design")
    expect(names).not.toContain("ui-ux-pro-max-full")
    expect(names).not.toContain("security-guidance")
  })

  test("design-system prompts route to token skill", () => {
    const names = nearest(BUILTIN_SKILLS, "create design system tokens and css variable theme").map(
      (skill) => skill.name,
    )

    expect(names.length).toBeLessThanOrEqual(3)
    expect(names).toContain("ckm:design-system")
    expect(names).not.toContain("ckm:slides")
  })

  test("non-frontend prompts hide detailed UI pack", () => {
    const names = nearest(BUILTIN_SKILLS, "debug provider api timeout in backend").map((skill) => skill.name)

    expect(names.length).toBeLessThanOrEqual(3)
    expect(names).toContain("feature-dev")
    expect(names).not.toContain("ui-ux-pro-max")
    expect(names).not.toContain("ckm:ui-styling")
    expect(names).not.toContain("ckm:brand")
    expect(names).not.toContain("ui-ux-pro-max-full")
  })

  test("frontend file context routes vague prompts to UI styling", () => {
    const names = nearest(BUILTIN_SKILLS, "fix this\npackages/app/src/components/Login.tsx").map((skill) => skill.name)

    expect(names.length).toBeLessThanOrEqual(3)
    expect(names).toContain("frontend-design")
    expect(names).toContain("ckm:ui-styling")
    expect(names).not.toContain("ckm:slides")
  })

  test("full guide only appears for deep ux audit", () => {
    const normal = nearest(BUILTIN_SKILLS, "build a chart card for dashboard").map((skill) => skill.name)
    const audit = nearest(BUILTIN_SKILLS, "run a deep ux audit for the dashboard").map((skill) => skill.name)

    expect(normal.length).toBeLessThanOrEqual(3)
    expect(audit.length).toBeLessThanOrEqual(3)
    expect(normal).toContain("frontend-design")
    expect(normal).toContain("ckm:ui-styling")
    expect(normal).not.toContain("ui-ux-pro-max-full")
    expect(audit).toContain("ui-ux-pro-max-full")
  })

  test("awesome claude skills are nearest-matched instead of listed wholesale", () => {
    const pack = [
      ...BUILTIN_SKILLS,
      {
        name: "changelog-generator",
        description: "Automatically creates user-facing changelogs from git commits and release notes.",
        location: "C:\\tmp\\awesome-claude-skills\\changelog-generator\\SKILL.md",
        content: "",
      },
      {
        name: "video-downloader",
        description: "Download videos from supported video platforms.",
        location: "C:\\tmp\\awesome-claude-skills\\video-downloader\\SKILL.md",
        content: "",
      },
    ]

    const names = nearest(pack, "write changelog for this release from git commits").map((skill) => skill.name)

    expect(names.length).toBeLessThanOrEqual(3)
    expect(names).toContain("changelog-generator")
    expect(names).not.toContain("video-downloader")
  })
})
