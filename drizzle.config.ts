// FIX #21: Serialize BigInt to string to avoid precision loss for values > 2^53.
// @ts-expect-error extending global
BigInt.prototype.toJSON = function () {
  return this.toString();
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
