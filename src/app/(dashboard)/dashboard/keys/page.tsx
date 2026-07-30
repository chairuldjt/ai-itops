import { listMyApiKeys } from "./actions";
import { ApiKeysClient } from "./client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "API Keys" };
export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const keys = await listMyApiKeys();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage keys for OpenAI / Anthropic compatible endpoints.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
          <CardDescription>
            Keys are shown once at creation — copy them immediately. Use them as{" "}
            <code>Authorization: Bearer sk_live_...</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysClient initialKeys={keys} />
        </CardContent>
      </Card>
    </div>
  );
}
