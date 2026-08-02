"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  DollarSignIcon,
  ActivityIcon,
  GaugeIcon,
  CoinsIcon,
  CheckCircleIcon,
  TimerIcon,
  RefreshCwIcon,
  WalletIcon,
  GiftIcon,
  ExternalLinkIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*                           HELPERS                                  */
/* ------------------------------------------------------------------ */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

type Props = {
  userName: string;
  creditBalance: number;
  stats: {
    totalSpend: number;
    totalRequests: number;
    avgRpm: number;
    totalTokens: number;
    successfulRequests: number;
    avgTpm: number;
    keyCount: number;
  };
  modelConsumption: { model: string; cost: number; requests: number }[];
  dailyTrend: { date: string; cost: number; requests: number }[];
};

const chartConfig = {
  cost: { label: "Cost", color: "var(--chart-1)" },
  requests: { label: "Requests", color: "var(--chart-2)" },
};

const DATE_PRESETS = ["All", "Last 30 Days", "Last 7 Days", "Today"] as const;

/* ------------------------------------------------------------------ */
/*                      METRIC TILE COMPONENT                         */
/* ------------------------------------------------------------------ */

function MetricTile({
  icon: Icon,
  label,
  value,
  subtitle,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold leading-tight tracking-tight">
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       DATE RANGE FILTER                            */
/* ------------------------------------------------------------------ */

function DateRangeFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 md:flex md:w-auto md:items-center">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={cn(
              "relative z-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm transition-colors",
              active === preset
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {preset}
          </button>
        ))}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Refresh dashboard">
        <RefreshCwIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       ACCOUNT BALANCE CARD                         */
/* ------------------------------------------------------------------ */

function AccountBalanceCard({ creditBalance }: { creditBalance: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-medium">
            Account Balance
          </div>
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            render={<Link href="/console/balance" />}
          >
            View <ExternalLinkIcon className="ml-1 size-3" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3.5">
          {/* Cash Balance */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WalletIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Cash Balance</span>
            </div>
            <div className="mt-2 text-xl font-semibold leading-tight">
              ${creditBalance.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Wallet balance (date filters excluded)
            </div>
          </div>

          {/* Voucher Balance */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GiftIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Voucher Balance</span>
            </div>
            <div className="mt-2 text-xl font-semibold leading-tight">
              $0.00
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Current remaining promotional credits
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*                       USAGE SUMMARY CARD                           */
/* ------------------------------------------------------------------ */

function UsageSummaryCard({ stats }: { stats: Props["stats"] }) {
  const metrics = [
    {
      icon: DollarSignIcon,
      label: "Total Spend",
      value: `$${stats.totalSpend.toFixed(2)}`,
      subtitle: "Spend in selected range",
    },
    {
      icon: ActivityIcon,
      label: "API Requests",
      value: stats.totalRequests.toLocaleString(),
      subtitle: "All requests sent",
    },
    {
      icon: GaugeIcon,
      label: "Average RPM",
      value: stats.avgRpm.toFixed(3),
      subtitle: "Average requests per minute",
    },
    {
      icon: CoinsIcon,
      label: "Total Tokens",
      value: stats.totalTokens.toLocaleString(),
      subtitle: "Tokens consumed in selected range",
    },
    {
      icon: CheckCircleIcon,
      label: "Successful Requests",
      value: stats.successfulRequests.toLocaleString(),
      subtitle: "Successfully returned responses",
    },
    {
      icon: TimerIcon,
      label: "Average TPM",
      value: stats.avgTpm.toFixed(3),
      subtitle: "Average tokens per minute",
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-base font-medium">
            <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            Usage Summary
          </div>
          <span className="text-sm text-muted-foreground">
            Follows Selected Date Range
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((m) => (
            <MetricTile key={m.label} {...m} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*                     MODEL DATA ANALYSIS CARD                       */
/* ------------------------------------------------------------------ */

function ModelAnalysisCard({
  modelConsumption,
  dailyTrend,
}: {
  modelConsumption: Props["modelConsumption"];
  dailyTrend: Props["dailyTrend"];
}) {
  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Model Data Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="consumption">
          <div className="border-b px-4 pt-2">
            <TabsList variant="line">
              <TabsTrigger value="consumption">Consumption Distribution</TabsTrigger>
              <TabsTrigger value="trend">Consumption Trend</TabsTrigger>
              <TabsTrigger value="ranking">Models Call Ranking</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="consumption" className="p-4 pt-3">
            {modelConsumption.length === 0 ? (
              <EmptyState
                title="No data yet"
                description="Start making API calls to see consumption data."
              >
                <Button variant="outline" size="sm" render={<Link href="/console/api-keys" />}>
                  Create an API key
                </Button>
              </EmptyState>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={modelConsumption}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="model"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="cost"
                    fill="var(--color-cost)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </TabsContent>

          <TabsContent value="trend" className="p-4 pt-3">
            {dailyTrend.length === 0 ? (
              <EmptyState
                title="No trend data"
                description="Data will appear once you start using the API."
              >
                <Button variant="outline" size="sm" render={<Link href="/console/chat" />}>
                  Try the chat playground
                </Button>
              </EmptyState>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--color-cost)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--color-requests)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="p-4 pt-3">
            {modelConsumption.length === 0 ? (
              <EmptyState
                title="No ranking data"
                description="Model rankings will appear based on usage."
              />
            ) : (
              <div className="space-y-3">
                {modelConsumption.map((m, i) => {
                  const maxCost = Math.max(...modelConsumption.map((x) => x.cost));
                  const pct = maxCost > 0 ? (m.cost / maxCost) * 100 : 0;
                  return (
                    <div key={m.model} className="flex items-center gap-3">
                      <span className="w-6 text-right text-sm font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {m.model}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ${m.cost.toFixed(4)} · {m.requests} reqs
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*                         MAIN COMPONENT                             */
/* ------------------------------------------------------------------ */

export function DashboardClient({
  userName,
  creditBalance,
  stats,
  modelConsumption,
  dailyTrend,
}: Props) {
  const [datePreset, setDatePreset] = React.useState<string>("Last 30 Days");

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="min-w-0 text-2xl font-medium leading-8" title={`${getGreeting()}, ${userName}`}>
          {getGreeting()}, {userName}
        </h1>
        <DateRangeFilter active={datePreset} onChange={setDatePreset} />
      </div>

      {/* Two-column grid: Balance (left) + Usage Summary (right) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2.75fr)]">
        <AccountBalanceCard creditBalance={creditBalance} />
        <UsageSummaryCard stats={stats} />
      </div>

      {/* Model Data Analysis */}
      <ModelAnalysisCard
        modelConsumption={modelConsumption}
        dailyTrend={dailyTrend}
      />
    </div>
  );
}
