"use client";

import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  CoinsIcon,
  TicketIcon,
  SettingsIcon,
  ExternalLinkIcon,
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
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export function BalanceClient({ creditBalance, transactions }: Props) {
  const [voucherCode, setVoucherCode] = React.useState("");
  const [emailAlerts, setEmailAlerts] = React.useState(false);

  const topupHistory = transactions.filter((t) =>
    ["topup", "refund", "signup_bonus", "adjustment"].includes(t.type)
  );
  const voucherHistory = transactions.filter(
    (t) => t.type === "adjustment" && t.note?.toLowerCase().includes("voucher")
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Personal Balance
            </h1>
            <Badge variant="outline" className="text-xs">
              Personal
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Top-ups and vouchers are only for the personal account.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <SettingsIcon className="size-4 mr-1" /> Configure
        </Button>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-600 dark:text-blue-400">
        Top-ups and vouchers are only for the personal account.
      </div>

      <FadeInStagger className="grid gap-4 md:grid-cols-2">
        <FadeInItem>
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CoinsIcon className="size-5 text-blue-500" />
                <CardTitle className="text-sm font-medium">
                  Cash Balance
                </CardTitle>
              </div>
              <CardDescription className="text-3xl font-bold text-foreground">
                ${creditBalance.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="sm">
                <ExternalLinkIcon className="size-4 mr-1" /> Top-up Personal
                Account
              </Button>
            </CardContent>
          </Card>
        </FadeInItem>

        <FadeInItem>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TicketIcon className="size-5 text-amber-500" />
                <CardTitle className="text-sm font-medium">
                  Voucher Balance
                </CardTitle>
              </div>
              <CardDescription className="text-3xl font-bold text-foreground">
                $0.00
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                0 valid vouchers available
              </p>
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
                  onClick={() => setVoucherCode("")}
                >
                  Redeem
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeInItem>
      </FadeInStagger>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Balance Alert Settings</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                Email reminders
              </Label>
              <Switch
                checked={emailAlerts}
                onCheckedChange={setEmailAlerts}
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

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
