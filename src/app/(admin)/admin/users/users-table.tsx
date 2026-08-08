"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setUserBanned, setUserRole } from "./actions";
import {
  SearchIcon,
  BanIcon,
  CheckCircle2Icon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  creditBalance: number;
  createdAt: Date;
};

export function UsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = React.useState(initialUsers);
  const [prev, setPrev] = React.useState(initialUsers);
  const [search, setSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [banTarget, setBanTarget] = React.useState<AdminUserRow | null>(null);

  if (prev !== initialUsers) {
    setPrev(initialUsers);
    setUsers(initialUsers);
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const toggleBan = async (u: AdminUserRow) => {
    setBusyId(u.id);
    const res = await setUserBanned({ userId: u.id, banned: !u.banned });
    setBusyId(null);
    setBanTarget(null);
    if (!res.ok) {
      toast.error("Failed: " + JSON.stringify((res as { error?: unknown }).error));
      return;
    }
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, banned: !u.banned } : x)),
    );
    toast.success(u.banned ? "User unbanned" : "User banned");
  };

  const toggleRole = async (u: AdminUserRow) => {
    const nextRole = u.role === "admin" ? "user" : "admin";
    setBusyId(u.id);
    const res = await setUserRole({ userId: u.id, role: nextRole as "user" | "admin" });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Failed: " + JSON.stringify((res as { error?: unknown }).error));
      return;
    }
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)),
    );
    toast.success(nextRole === "admin" ? "Promoted to admin" : "Changed to user");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? (
                      <ShieldIcon className="size-3 mr-1" aria-hidden="true" />
                    ) : (
                      <UserIcon className="size-3 mr-1" aria-hidden="true" />
                    )}
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  ${(u.creditBalance / 1_000_000).toFixed(2)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRole(u)}
                      disabled={busyId === u.id}
                      title={u.role === "admin" ? "Change to user" : "Promote to admin"}
                    >
                      <ShieldIcon className="size-4" />
                    </Button>
                    {u.banned ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBan(u)}
                        disabled={busyId === u.id}
                        title="Unban user"
                      >
                        <CheckCircle2Icon className="size-4 text-emerald-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setBanTarget(u)}
                        disabled={busyId === u.id}
                        title="Ban user"
                      >
                        <BanIcon className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={banTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBanTarget(null);
        }}
        onConfirm={() => {
          if (banTarget) toggleBan(banTarget);
        }}
        title={`Ban ${banTarget?.name}?`}
        description="This user will be blocked from using their API keys until unbanned."
        confirmLabel="Ban user"
        variant="destructive"
        loading={busyId === banTarget?.id}
      />
    </div>
  );
}
