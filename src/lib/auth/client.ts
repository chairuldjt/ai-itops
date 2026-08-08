import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { getAppBaseUrl } from "@/lib/site";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? getAppBaseUrl(),
  plugins: [adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  updateUser,
  changePassword,
  getSession: getClientSession,
} = authClient;

/**
 * After a successful email sign-in, fetch the session to learn the user's role
 * and set a short-lived `ba_role` cookie that the edge middleware can read
 * (middleware can't touch the DB).
 */
export async function signInAndSetRoleCookie(
  credentials: { email: string; password: string },
) {
  const res = await signIn.email(credentials);
  if (res.error || !res.data) return res;
  // The session cookie is already set by better-auth. Now fetch the session
  // to learn the role and set `ba_role`.
  try {
    const me = await authClient.getSession();
    const role = (me.data?.user as { role?: string } | undefined)?.role ?? "user";
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `ba_role=${role}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`;
  } catch {
    // ignore — layout will still check server-side
  }
  return res;
}

