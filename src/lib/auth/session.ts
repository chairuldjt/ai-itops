import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Server-side helper to get the current session.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

/**
 * Require an authenticated user or throw.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Require the current user to have the "admin" role.
 */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}
