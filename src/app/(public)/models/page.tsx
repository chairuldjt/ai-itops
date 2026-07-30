import { listEnabledModels } from "@/lib/gateway/model-resolver";
import type { Metadata } from "next";
import { ModelsCatalog } from "./catalog";

export const metadata: Metadata = {
  title: "Models — AI Gateway",
  description: "Browse and compare available AI models.",
};

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const allModels = await listEnabledModels();
  const models = allModels.map((m) => ({
    publicId: m.publicId,
    type: m.type,
    description: m.description,
    provider: m.provider,
    pricing: m.pricing,
    capabilities: m.capabilities,
    tags: m.tags,
  }));

  return <ModelsCatalog models={models} />;
}
