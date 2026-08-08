import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { TopUpForm } from "./top-up-form";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Users"
        description={`${rows.length} users. Manage roles, bans, and credit.`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All users</CardTitle>
            <CardDescription>
              Sorted by newest first. Promote, ban, or unban directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersTable
              initialUsers={rows.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                banned: u.banned,
                creditBalance: Number(u.creditBalance),
                createdAt: u.createdAt,
              }))}
            />
          </CardContent>
        </Card>
        <TopUpForm users={rows.map((u) => ({ id: u.id, name: u.name, email: u.email }))} />
      </div>
    </div>
  );
}
