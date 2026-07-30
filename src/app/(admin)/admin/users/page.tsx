import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TopUpForm } from "./top-up-form";

export const metadata: Metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} users. Top-up credit manually via the form on the right.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All users</CardTitle>
            <CardDescription>Sorted by newest first.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === "admin" ? "default" : u.role === "banned" ? "destructive" : "secondary"
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      ${(Number(u.creditBalance) / 1_000_000).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TopUpForm users={rows.map((u) => ({ id: u.id, name: u.name, email: u.email }))} />
      </div>
    </div>
  );
}
