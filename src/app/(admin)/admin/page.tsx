import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAllModels } from "./models/actions";
import { ModelsTable } from "./models/models-table";
import { ModelFormDialog } from "./models/model-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { formatNumber } from "@/lib/utils";
import { sql } from "drizzle-orm";
import { BotIcon, UsersIcon, CheckCircle2Icon, UserCheckIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — AI Gateway" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") redirect("/console/dashboard");

  const models = await listAllModels();
  const [userAgg] = await db
    .select({
      total: sql<number>`coalesce(count(*), 0)`,
      banned: sql<number>`coalesce(sum(case when ${users.banned} then 1 else 0 end), 0)`,
    })
    .from(users);

  const enabledCount = models.filter((m) => m.enabled).length;
  const totalUsers = Number(userAgg?.total ?? 0);
  const bannedUsers = Number(userAgg?.banned ?? 0);
  const activeUsers = totalUsers - bannedUsers;

  const stats = [
    {
      label: "Total Models",
      value: models.length,
      desc: "Models in the catalog",
      icon: BotIcon,
    },
    {
      label: "Enabled Models",
      value: enabledCount,
      desc: "Visible to end users",
      icon: CheckCircle2Icon,
    },
    {
      label: "Total Users",
      value: totalUsers,
      desc: "Registered accounts",
      icon: UsersIcon,
    },
    {
      label: "Active Users",
      value: activeUsers,
      desc: `${bannedUsers} banned`,
      icon: UserCheckIcon,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Admin Overview"
        description={`Welcome back, ${session.user.name}. Here's what's happening.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="card-hover relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl"
              aria-hidden="true"
            />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatNumber(s.value)}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {s.desc}
                  </div>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              Configure name mapping, pricing, capabilities, and image policies.
            </CardDescription>
          </div>
          <ModelFormDialog />
        </CardHeader>
        <CardContent className="p-0">
          <ModelsTable initialModels={models} />
        </CardContent>
      </Card>
    </div>
  );
}
