"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  DownloadIcon,
  CalendarIcon,
  BarChart3Icon,
} from "lucide-react";

type LogRow = {
  id: string;
  createdAt: Date;
  modelPublicId: string;
  apiFormat: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costMicroUsd: number;
  status: string;
  latencyMs: number | null;
  apiKeyId: string;
};

type Props = {
  logs: LogRow[];
  userKeys: { id: string; prefix: string; name: string }[];
  modelList: string[];
  currentPage: number;
  totalPages: number;
};

function statusBadge(status: string) {
  switch (status) {
    case "ok":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          OK
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">Error</Badge>
      );
    case "canned":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          Canned
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="secondary">Rejected</Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function UsageClient({
  logs,
  userKeys,
  modelList,
  currentPage,
  totalPages,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = React.useState(
    searchParams.get("from") ?? ""
  );
  const [dateTo, setDateTo] = React.useState(
    searchParams.get("to") ?? ""
  );
  const [modelFilter, setModelFilter] = React.useState(
    searchParams.get("model") ?? "all"
  );
  const [keyFilter, setKeyFilter] = React.useState(
    searchParams.get("key") ?? "all"
  );

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (modelFilter !== "all") params.set("model", modelFilter);
    if (keyFilter !== "all") params.set("key", keyFilter);
    params.set("page", "1");
    router.push(`/console/usage?${params.toString()}`);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setModelFilter("all");
    setKeyFilter("all");
    router.push("/console/usage");
  };

  const exportCsv = () => {
    const headers = [
      "Time",
      "Model",
      "API Format",
      "Prompt Tokens",
      "Completion Tokens",
      "Total Tokens",
      "Cost (USD)",
      "Status",
      "Latency (ms)",
    ];
    const rows = logs.map((l) => [
      l.createdAt.toISOString(),
      l.modelPublicId,
      l.apiFormat,
      l.promptTokens,
      l.completionTokens,
      l.totalTokens,
      (l.costMicroUsd / 1_000_000).toFixed(6),
      l.status,
      l.latencyMs ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage Logs</h1>
        <p className="text-sm text-muted-foreground">
          Detailed API request logs and token consumption.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Model</label>
              <Select value={modelFilter} onValueChange={(v) => v && setModelFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {modelList.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API Key</label>
              <Select value={keyFilter} onValueChange={(v) => v && setKeyFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Keys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Keys</SelectItem>
                  {userKeys.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name} ({k.prefix}…)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={applyFilters}>
              <CalendarIcon className="size-4 mr-1" /> Search
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <DownloadIcon className="size-4 mr-1" /> Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Tokens (In/Out)</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState
                        icon={<BarChart3Icon className="size-7" />}
                        title="No Usage Logs"
                        description="API usage logs will appear here once you start making requests."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => {
                    const keyInfo = userKeys.find((k) => k.id === l.apiKeyId);
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {l.createdAt.toLocaleDateString()}{" "}
                          {l.createdAt.toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {l.modelPublicId}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {keyInfo?.prefix ?? l.apiKeyId.slice(0, 12)}****
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {l.apiFormat}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {l.promptTokens.toLocaleString()} /{" "}
                          {l.completionTokens.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          ${(l.costMicroUsd / 1_000_000).toFixed(6)}
                        </TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.latencyMs != null ? `${l.latencyMs}ms` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={`/console/usage?page=${Math.max(1, currentPage - 1)}`}
                      text="Prev"
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum =
                      totalPages <= 5
                        ? i + 1
                        : currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href={`/console/usage?page=${pageNum}`}
                          isActive={pageNum === currentPage}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href={`/console/usage?page=${Math.min(totalPages, currentPage + 1)}`}
                      text="Next"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
