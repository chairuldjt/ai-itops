import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);

// Also export a generic authClient helper (optional, for type narrowing)
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}
