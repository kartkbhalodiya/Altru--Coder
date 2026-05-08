import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/**/*.sql.ts",
  out: "./migration",
  dbCredentials: {
    url: "/home/thdxr/.local/share/altru-coder/altru.db",
  },
})
