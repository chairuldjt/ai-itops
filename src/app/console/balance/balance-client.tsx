"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  FadeInStagger,
  FadeInItem,
} from "@/components/motion";
import { PageHeader } from "@/components/layout/page-header";
import {
  CoinsIcon,
  TicketIcon,
  ExternalLinkIcon,
  InfoIcon,
} from "lucide-react";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note: string | null;
  createdAt: Date;
};

type Props = {
  creditBalance: number;
  transactions: Transaction[];
};

function txTypeBadge(type: string) {
  switch (type) {
    case "topup":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          Top-up
        </Badge>
      );
    case "deduction":
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          Deduction
        </Badge>
      );
    case "refund":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          Refund
        </Badge>
      );
    case "signup_bonus":
      return (
        <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
          Bonus
        </Badge>
      );
    case "adjustment":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          Adjustment
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export function BalanceClient({ creditBalance, transactions }: Props) {
  const [voucherCode, setVoucherCode] = React.useState("");

  const topupHistory = transactions.filter((t) =>
    ["topup", "refund", "signup_bonus", "adjustment"].includes(t.type)
  );
  const voucherHistory = transactions.filter(
    (t) => t.type === "adjustment" && t.note?.toLowerCase().includes("voucher")
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Billing"
        description="Manage your balance, top-ups, and vouchers."
      />

      <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/80">
        <InfoIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        Top-ups and vouchers are only for the personal account.
      </div>

      <FadeInStagger className="grid items-stretch gap-4 md:grid-cols-2">
        <FadeInItem className="h-full">
          <Card className="ring-gradient glow-sm relative flex h-full flex-col overflow-hidden">
            <div
              className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/20 blur-3xl"
              aria-hidden="true"
            />
            <CardHeader className="relative pb-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                  <CoinsIcon className="size-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">Cash Balance</CardTitle>
              </div>
              <CardDescription className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                ${creditBalance.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative mt-auto">
              <Button
                className="w-full"
                size="sm"
                onClick={() => toast.info("Top-ups are coming soon")}
              >
                <ExternalLinkIcon className="size-4 mr-1" /> Top-up Personal
                Account
              </Button>
            </CardContent>
          </Card>
        </FadeInItem>

        <FadeInItem className="h-full">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/25">
                  <TicketIcon className="size-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">Voucher Balance</CardTitle>
              </div>
              <CardDescription className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                $0.00
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={!voucherCode.trim()}
                  onClick={() => {
                    toast.info("Voucher redemption coming soon");
                    setVoucherCode("");
                  }}
                >
                  Redeem
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeInItem>
      </FadeInStagger>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="topup">
            <TabsList>
              <TabsTrigger value="topup">Top-up History</TabsTrigger>
              <TabsTrigger value="voucher">Voucher History</TabsTrigger>
            </TabsList>

            <TabsContent value="topup" className="pt-4">
              {topupHistory.length === 0 ? (
                <EmptyState
                  title="No Bills Available"
                  description="Your top-up history will appear here."
                />
              ) : (
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topupHistory.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">
                            {t.id.slice(0, 16)}…
                          </TableCell>
                          <TableCell>{txTypeBadge(t.type)}</TableCell>
                          <TableCell
                            className={`font-mono ${
                              t.amount >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {t.amount >= 0 ? "+" : ""}
                            ${t.amount.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.createdAt.toLocaleDateString()}{" "}
                            {t.createdAt.toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="voucher" className="pt-4">
              {voucherHistory.length === 0 ? (
                <EmptyState
                  title="No Voucher History"
                  description="Voucher redemptions will appear here."
                />
              ) : (
                <div className="rounded-xl border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherHistory.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">
                            {t.id.slice(0, 16)}…
                          </TableCell>
                          <TableCell>{txTypeBadge(t.type)}</TableCell>
                          <TableCell className="font-mono text-emerald-600 dark:text-emerald-400">
                            +${t.amount.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.createdAt.toLocaleDateString()}{" "}
                            {t.createdAt.toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
