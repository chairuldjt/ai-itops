import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function ConsoleSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <SettingsClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: (session.user as { image?: string }).image ?? "",
      }}
    />
  );
}
