"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ModelsList, type ModelRow } from "@/components/models-list";

type Model = ModelRow & {
  id: string;
  upstreamId: string;
  tags: string[];
};

export function ModelsClient({ models }: { models: Model[] }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Models"
        description="Browse available AI models and their pricing."
      />
      <ModelsList models={models} />
    </div>
  );
}
