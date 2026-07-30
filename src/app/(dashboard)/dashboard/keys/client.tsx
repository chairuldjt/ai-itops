"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ApiKey } from "@/lib/db/schema";
import {
  createApiKey,
  deleteApiKey,
  toggleApiKeyEnabled,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, Trash2Icon, CopyIcon, CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const Schema = z.object({
  name: z.string().min(1).max(100),
  rpmLimit: z.coerce.number().int().positive().optional(),
  monthlyBudgetUsd: z.coerce.number().min(0).optional(),
});

export function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = React.useState(initialKeys);
  const [open, setOpen] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const form = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema) as never,
    defaultValues: { name: "", rpmLimit: undefined, monthlyBudgetUsd: undefined },
  });

  const onCreate = async (values: z.infer<typeof Schema>) => {
    const res = await createApiKey(values);
    if (res.ok && "key" in res) {
      toast.success("API key created");
      setNewKey(res.key as string);
      setOpen(false);
      form.reset();
      // refresh list
      window.location.reload();
    } else {
      toast.error("Failed: " + JSON.stringify((res as { error?: unknown }).error));
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    await deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setBusyId(null);
    setDeleteTarget(null);
  };

  const onToggle = async (id: string, enabled: boolean) => {
    setBusyId(id);
    await toggleApiKeyEnabled(id, enabled);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, enabled } : k)));
    setBusyId(null);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {newKey && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="size-4" /> Key created — copy it now
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs">
              {newKey}
            </code>
            <Button size="sm" onClick={() => copy(newKey)}>
              {copied ? (
                <>
                  <CheckIcon className="size-4 mr-1" /> Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-4 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This key will never be shown again. Store it securely.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <PlusIcon className="size-4 mr-1" /> Create API key
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                The full key is shown once. You can set optional rate / budget
                limits.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onCreate)}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input {...form.register("name")} placeholder="Production key" />
                </Field>
                <Field>
                  <FieldLabel>Rate limit (req/min, optional)</FieldLabel>
                  <Input type="number" {...form.register("rpmLimit")} placeholder="60" />
                </Field>
                <Field>
                  <FieldLabel>Monthly budget (USD, optional)</FieldLabel>
                  <Input type="number" step="0.01" {...form.register("monthlyBudgetUsd")} placeholder="10.00" />
                </Field>
              </FieldGroup>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Limits</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead className="text-center">Enabled</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                No API keys yet.
              </TableCell>
            </TableRow>
          )}
          {keys.map((k) => (
            <TableRow key={k.id}>
              <TableCell className="font-medium">{k.name}</TableCell>
              <TableCell className="font-mono text-xs">{k.keyPrefix}…</TableCell>
              <TableCell className="text-xs">
                {k.rpmLimit && <Badge variant="outline">{k.rpmLimit} rpm</Badge>}
                {k.monthlyBudget != null && (
                  <Badge variant="outline" className="ml-1">
                    ${(Number(k.monthlyBudget) / 1_000_000).toFixed(2)}/mo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {k.lastUsedAt ? k.lastUsedAt.toLocaleString() : "never"}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={k.enabled}
                  onCheckedChange={(v) => onToggle(k.id, v)}
                  disabled={busyId === k.id}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(k.id)}
                  disabled={busyId === k.id}
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); }}
        title="Revoke API key"
        description="This API key will stop working immediately. This action cannot be undone."
        confirmLabel="Revoke key"
        variant="destructive"
        loading={busyId === deleteTarget}
      />
    </div>
  );
}
