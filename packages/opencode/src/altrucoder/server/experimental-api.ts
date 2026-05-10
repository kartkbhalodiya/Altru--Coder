export namespace ExperimentalApi {
  export const header = "x-altru-coder-experimental-api"
  export const query = "experimentalApi"
  export const message = "This endpoint requires experimentalApi capability"

  const truthy = new Set(["1", "true", "yes", "on"])

  export function enabled(input: { url: string; header(name: string): string | null | undefined }) {
    if (truthy.has((input.header(header) ?? "").toLowerCase())) return true
    const url = new URL(input.url, "http://localhost")
    return truthy.has((url.searchParams.get(query) ?? "").toLowerCase())
  }

  export function response() {
    return {
      data: { message },
      errors: [{ message }],
      success: false as const,
    }
  }
}
