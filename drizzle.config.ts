import { defineConfig } from "drizzle-kit";
import fs from "fs";

const dbDir = process.env.NODE_ENV === "production" && fs.existsSync("/opt/render/project/src/data")
  ? "/opt/render/project/src/data"
  : ".";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `${dbDir}/data.db`,
  },
});
