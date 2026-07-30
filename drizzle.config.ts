// Patch BigInt so drizzle-kit's JSON.stringify can serialize it.
// @ts-expect-error extending global
BigInt.prototype.toJSON = function () {
  return Number(this);
};

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
