"use client";

import * as React from "react";
import { toast } from "sonner";
import { createApiKey, deleteApiKey, toggleApiKeyEnabled, updateApiKeyModels } from "@/app/(dashboard)/dashboard/keys/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconSwap } from "@/components/motion";
import {
  PlusIcon,
  SearchIcon,
  RotateCcwIcon,
  Trash2Icon,
  CopyIcon,
  CheckIcon,
  MoreHorizontalIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  ListChecksIcon,
} from "lucide-react";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  rpmLimit: number | null;
  monthlyBudget: number | null;
  monthlySpent: number;
  allowedModels: string[] | null;
  enabled: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

type Props = {
  initialKeys: KeyRow[];
  availableModels: { id: string; provider: string }[];
};

function ModelCheckList({
  models,
  selected,
  onToggle,
}: {
  models: { id: string; provider: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (models.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No enabled models available. Ask an admin to enable models first.
      </p>
    );
  }
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border p-2 space-y-1">
      {models.map((m) => (
        <label
          key={m.id}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
        >
          <Checkbox
            checked={selected.has(m.id)}
            onCheckedChange={() => onToggle(m.id)}
          />
          <span className="font-mono text-xs">{m.id}</span>
          <span className="ml-auto text-xs text-muted-foreground">{m.provider}</span>
        </label>
      ))}
    </div>
  );
}

export function ApiKeysClient({ initialKeys, availableModels }: Props) {
  const [keys, setKeys] = React.useState(initialKeys);
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [expiration, setExpiration] = React.useState<string>("never");
  const [customDate, setCustomDate] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [unlimitedQuota, setUnlimitedQuota] = React.useState(true);
  const [quotaAmount, setQuotaAmount] = React.useState("");
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  // Create-sheet model allowlist state
  const [allModels, setAllModels] = React.useState(true);
  const [selectedModels, setSelectedModels] = React.useState<Set<string>>(new Set());
  // Edit-models dialog state
  const [editTarget, setEditTarget] = React.useState<KeyRow | null>(null);
  const [editAllModels, setEditAllModels] = React.useState(true);
  const [editSelectedModels, setEditSelectedModels] = React.useState<Set<string>>(new Set());
  const [editBusy, setEditBusy] = React.useState(false);

  const openEditModels = (k: KeyRow) => {
    setEditTarget(k);
    setEditAllModels(k.allowedModels == null);
    setEditSelectedModels(new Set(k.allowedModels ?? []));
  };

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEditModel = (id: string) => {
    setEditSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const filteredKeys = keys.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      k.name.toLowerCase().includes(q) ||
      k.keyPrefix.toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredKeys.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredKeys.map((k) => k.id)));
    }
  };

  const onCreate = async () => {
    if (!newKeyName.trim()) return;
    if (!allModels && selectedModels.size === 0) {
      toast.error("Select at least one model, or enable 'All models'");
      return;
    }
    setBusy(true);

    const budget = !unlimitedQuota && quotaAmount ? Number(quotaAmount) : undefined;
    const allowedModels = allModels ? undefined : [...selectedModels];

    // Compute expiration date
    let expiresAt: Date | undefined;
    if (expiration === "month") {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      expiresAt = d;
    } else if (expiration === "day") {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      expiresAt = d;
    } else if (expiration === "custom" && customDate) {
      expiresAt = new Date(customDate);
    }

    const results = await Promise.all(
      Array.from({ length: quantity }, () =>
        createApiKey({
          name: newKeyName.trim(),
          monthlyBudgetUsd: budget,
          expiresAt,
          allowedModels,
        })
      )
    );

    const createdKeys = results
      .filter((r): r is { ok: true; id: string; key: string } => r.ok && "key" in r)
      .map((r) => r.key);

    if (createdKeys.length > 0) {
      setCreatedKey(createdKeys.join("\n"));
      toast.success(`API key${createdKeys.length > 1 ? "s" : ""} created`);
      // Add optimistic items to state
      setKeys((prev) => [
        ...results
          .filter((r): r is { ok: true; id: string; key: string } => r.ok && "key" in r)
          .map((r) => ({
            id: r.id,
            name: newKeyName.trim(),
            keyPrefix: r.key.slice(0, 12),
            rpmLimit: null,
            monthlyBudget: budget ? Math.round(budget * 1_000_000) : null,
            monthlySpent: 0,
            allowedModels: allModels ? null : [...selectedModels],
            enabled: true,
            expiresAt: expiresAt ?? null,
            lastUsedAt: null,
            createdAt: new Date(),
          })),
        ...prev,
      ]);
    } else {
      const firstError = results.find((r) => !r.ok) as
        | { ok: false; error?: unknown }
        | undefined;
      toast.error("Failed to create key: " + JSON.stringify(firstError?.error ?? "unknown error"));
    }

    setSheetOpen(false);
    setNewKeyName("");
    setQuantity(1);
    setAllModels(true);
    setSelectedModels(new Set());
    setBusy(false);
  };

  const onDelete = async (id: string) => {
    await deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeleteTarget(null);
    toast.success("API key deleted");
  };

  const onDeleteSelected = async () => {
    await Promise.all(
      Array.from(selectedIds).map((id) => deleteApiKey(id))
    );
    const count = selectedIds.size;
    setKeys((prev) => prev.filter((k) => !selectedIds.has(k.id)));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    toast.success(`${count} API key${count > 1 ? "s" : ""} deleted`);
  };

  const onToggle = async (id: string, enabled: boolean) => {
    await toggleApiKeyEnabled(id, enabled);
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, enabled } : k))
    );
    toast.success(enabled ? "API key enabled" : "API key disabled");
  };

  const onSaveModels = async () => {
    if (!editTarget) return;
    if (!editAllModels && editSelectedModels.size === 0) {
      toast.error("Select at least one model, or enable 'All models'");
      return;
    }
    setEditBusy(true);
    const next = editAllModels ? null : [...editSelectedModels];
    const res = await updateApiKeyModels(editTarget.id, next);
    setEditBusy(false);
    if (!res.ok) {
      toast.error("Failed: " + JSON.stringify(res.error));
      return;
    }
    setKeys((prev) =>
      prev.map((k) => (k.id === editTarget.id ? { ...k, allowedModels: next } : k))
    );
    setEditTarget(null);
    toast.success("Allowed models updated");
  };

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  };

  const copyUrl = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 1500);
    toast.success(`${label} URL copied`);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API Keys"
        description="Create and manage keys for OpenAI-compatible endpoints."
      />

      <Card>
        <CardHeader>
          <CardTitle>Base URLs</CardTitle>
          <CardDescription>
            Point your client at one of these endpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">OpenAI</span>
            <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">
              {baseUrl}/v1
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => copyUrl(`${baseUrl}/v1`, "openai")}
            >
              <IconSwap
                activeKey={copiedUrl === "openai" ? "check" : "copy"}
                className="mr-1 flex items-center justify-center"
              >
                {copiedUrl === "openai" ? (
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                ) : (
                  <CopyIcon className="size-3.5" aria-hidden="true" />
                )}
              </IconSwap>
              {copiedUrl === "openai" ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(createdKey)} onOpenChange={(v) => !v && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="size-5" /> Key created — copy it now
            </DialogTitle>
            <DialogDescription>
              This key will never be shown again. Store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 my-2">
            <code className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
              {createdKey}
            </code>
            <Button size="sm" onClick={() => createdKey && copyKey(createdKey)}>
              <CopyIcon className="size-4 mr-1" /> Copy
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or key prefix..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
              >
                <RotateCcwIcon className="size-4 mr-1" /> Reset
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setSheetOpen(true)}>
                <PlusIcon className="size-4 mr-1" /> Create Key
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDelete(true)}
                  >
                    <Trash2Icon className="size-4 mr-1" /> Delete Selected (
                    {selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredKeys.length > 0 &&
                        selectedIds.size === filteredKeys.length
                      }
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Remaining/Total</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <EmptyState
                        icon={<KeyRoundIcon className="size-7" />}
                        title="No Results Found"
                        description="Create an API key to get started."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKeys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(k.id)}
                          onCheckedChange={() => toggleSelect(k.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={k.enabled ? "default" : "secondary"}
                          className={
                            k.enabled
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : ""
                          }
                        >
                          {k.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {k.allowedModels == null ? (
                          <Badge variant="outline">All models</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="cursor-pointer"
                            title={k.allowedModels.join(", ")}
                            onClick={() => openEditModels(k)}
                          >
                            {k.allowedModels.length} model{k.allowedModels.length === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/v1`
                          : "/v1"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {k.keyPrefix}****
                      </TableCell>
                      <TableCell className="text-xs">
                        {k.monthlyBudget != null ? (
                          <>
                            $
                            {(
                              (k.monthlyBudget - k.monthlySpent) /
                              1_000_000
                            ).toFixed(2)}{" "}
                            / ${(k.monthlyBudget / 1_000_000).toFixed(2)}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Unlimited</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {k.createdAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {k.expiresAt
                          ? k.expiresAt.toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Key actions" />
                            }
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onToggle(k.id, !k.enabled)}
                            >
                              {k.enabled ? (
                                <EyeOffIcon className="size-4" />
                              ) : (
                                <EyeIcon className="size-4" />
                              )}
                              {k.enabled ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModels(k)}>
                              <ListChecksIcon className="size-4" />
                              Edit allowed models
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(k.id)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>Create API Key</SheetTitle>
            <SheetDescription>
              Configure your new API key settings.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "never", label: "Never Expires" },
                  { value: "month", label: "A Month" },
                  { value: "day", label: "One Day" },
                  { value: "custom", label: "Custom" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={expiration === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExpiration(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              {expiration === "custom" && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Unlimited Quota</Label>
                <Switch
                  checked={unlimitedQuota}
                  onCheckedChange={setUnlimitedQuota}
                  size="sm"
                />
              </div>
              {!unlimitedQuota && (
                <Input
                  type="number"
                  placeholder="Quota amount (USD)"
                  value={quotaAmount}
                  onChange={(e) => setQuotaAmount(e.target.value)}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allowed Models</Label>
                  <p className="text-xs text-muted-foreground">
                    Restrict which models this key can use.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">All models</span>
                  <Switch
                    checked={allModels}
                    onCheckedChange={setAllModels}
                    size="sm"
                  />
                </div>
              </div>
              {!allModels && (
                <ModelCheckList
                  models={availableModels}
                  selected={selectedModels}
                  onToggle={toggleModel}
                />
              )}
            </div>

          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={!newKeyName.trim() || busy}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); }}
        title="Revoke API key"
        description="This API key will stop working immediately. This action cannot be undone."
        confirmLabel="Revoke key"
        variant="destructive"
      />

      <ConfirmDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        onConfirm={onDeleteSelected}
        title={`Delete ${selectedIds.size} API key(s)?`}
        description="All selected keys will be revoked immediately. This action cannot be undone."
        confirmLabel="Delete keys"
        variant="destructive"
      />

      {/* Edit allowed models dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allowed models — {editTarget?.name}</DialogTitle>
            <DialogDescription>
              Requests using models outside this list will be rejected with 403.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Allow all models</Label>
              <Switch
                checked={editAllModels}
                onCheckedChange={setEditAllModels}
                size="sm"
              />
            </div>
            {!editAllModels && (
              <ModelCheckList
                models={availableModels}
                selected={editSelectedModels}
                onToggle={toggleEditModel}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={onSaveModels} disabled={editBusy}>
              {editBusy ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
