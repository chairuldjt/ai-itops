import { db } from "@/lib/db";
import { models } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { PricingPageContent } from "./content";

export const metadata: Metadata = {
  title: "Pricing — AI Gateway",
  description: "Simple, transparent pricing for every workload.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const rows = await db
    .select()
    .from(models)
    .where(eq(models.enabled, true))
    .orderBy(models.sortOrder, models.publicId);

  const modelData = rows.map((m) => ({
    publicId: m.publicId,
    type: m.type,
    provider: m.provider,
    pricing: m.pricing,
    capabilities: m.capabilities,
  }));

  return <PricingPageContent models={modelData} />;
}
