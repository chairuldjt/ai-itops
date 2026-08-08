"use client";

import { PageHeader } from "@/components/layout/page-header";
import { FadeIn } from "@/components/motion";
import { ModelsList, type ModelRow } from "@/components/models-list";

type Model = ModelRow & { tags: string[] };

export function ModelsCatalog({ models }: { models: Model[] }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Models"
        description="Browse and compare available AI models"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Models" }]}
      />

      <FadeIn delay={0.1}>
        <div className="mt-8">
          <ModelsList models={models} />
        </div>
      </FadeIn>
    </div>
  );
}
