import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your unified AI gateway at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <CardDescription>Create keys for your apps</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/keys"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Manage keys →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Models</CardTitle>
            <CardDescription>Browse catalog & pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/models"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View models →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quickstart</CardTitle>
            <CardDescription>Docs & examples</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/docs"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Read docs →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quickstart snippet</CardTitle>
          <CardDescription>
            Use the gateway like OpenAI — just point your base URL here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
{`curl ${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain"}/v1/chat/completions \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "my-gpt-4o",
    "messages": [{"role":"user","content":"Hello"}]
  }'`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
