"use client";

import * as React from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Model } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteModel,
  toggleModelEnabled,
} from "@/app/(admin)/admin/models/actions";
import { ModelFormDialog } from "./model-form-dialog";
import { PencilIcon, Trash2Icon, SearchIcon } from "lucide-react";

export function ModelsTable({ initialModels }: { initialModels: Model[] }) {
  const [prevModels, setPrevModels] = React.useState(initialModels);
  const [models, setModels] = React.useState(initialModels);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  if (prevModels !== initialModels) {
    setPrevModels(initialModels);
    setModels(initialModels);
  }

  const filtered = models.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.publicId.toLowerCase().includes(q) ||
      m.upstreamId.toLowerCase().includes(q) ||
      (m.provider ?? "").toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
    );
  });

  const onToggle = async (id: string, enabled: boolean) => {
    setBusyId(id);
    try {
      await toggleModelEnabled(id, enabled);
      setModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled } : m)),
      );
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteModel(id);
      if (res?.ok === false) {
        toast.error(res.error ?? "Failed to delete model");
      } else if (res?.deleted === false) {
        // FK constraint — model was disabled instead of deleted.
        setModels((prev) =>
          prev.map((m) => (m.id === id ? { ...m, enabled: false } : m)),
        );
        toast.warning("Model has usage logs — disabled instead of deleted.");
      } else {
        setModels((prev) => prev.filter((m) => m.id !== id));
        toast.success("Model deleted");
      }
    } catch {
      toast.error("Failed to delete model");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-3 p-4">
      <div className="relative w-full max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, upstream, provider, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

    <div className="rounded-lg border overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Public ID</TableHead>
          <TableHead>Upstream</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Pricing (per 1M)</TableHead>
          <TableHead>Capabilities</TableHead>
          <TableHead>Image Policy</TableHead>
          <TableHead className="text-center">Enabled</TableHead>
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
              {models.length === 0
                ? <>No models yet. Click &ldquo;Add Model&rdquo; to create one.</>
                : "No models match your search."}
            </TableCell>
          </TableRow>
        )}
        {filtered.map((m) => {
          const p = m.pricing ?? {};
          const c = m.capabilities ?? {};
          return (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-sm">{m.publicId}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {m.upstreamId}
              </TableCell>
              <TableCell className="text-sm">{m.provider ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{m.type}</Badge>
              </TableCell>
              <TableCell className="text-xs font-mono">
                {p.per1MInput != null && (
                  <div>in: ${p.per1MInput.toFixed(2)}</div>
                )}
                {p.per1MOutput != null && (
                  <div>out: ${p.per1MOutput.toFixed(2)}</div>
                )}
                {m.type === "chat" && p.per1MCached != null && (
                  <div>cache: ${p.per1MCached.toFixed(2)}</div>
                )}
                {m.type !== "chat" && p.perUnit != null && <div>unit: ${p.perUnit.toFixed(4)}</div>}
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex flex-wrap gap-1">
                  {c.supportsImageInput && <Badge variant="outline">vision</Badge>}
                  {c.supportsTools && <Badge variant="outline">tools</Badge>}
                  {c.supportsAudioInput && <Badge variant="outline">audio</Badge>}
                  {c.supportsStreaming === false && (
                    <Badge variant="destructive">no-stream</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge
                  variant={
                    m.imagePolicy === "reject_error"
                      ? "destructive"
                      : m.imagePolicy === "canned_response"
                        ? "outline"
                        : "secondary"
                  }
                >
                  {m.imagePolicy}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={m.enabled}
                  onCheckedChange={(v) => onToggle(m.id, v)}
                  disabled={busyId === m.id}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <ModelFormDialog
                    model={m}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <PencilIcon className="size-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(m.id)}
                    disabled={busyId === m.id}
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
    </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget); }}
        title="Delete model"
        description="This model will be permanently removed. This action cannot be undone."
        confirmLabel="Delete model"
        variant="destructive"
        loading={busyId === deleteTarget}
      />
    </>
  );
}
