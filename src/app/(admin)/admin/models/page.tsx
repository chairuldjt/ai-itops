import { listAllModels } from "./actions";
import { ModelsTable } from "./models-table";
import { ModelFormDialog } from "./model-form-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Models — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminModelsPage() {
  const models = await listAllModels();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="text-sm text-muted-foreground">
            Full control: name mapping, pricing, capabilities, image policy.
          </p>
        </div>
        <ModelFormDialog />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Models ({models.length})</CardTitle>
          <CardDescription>
            Disabled models are hidden from <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/v1/models</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ModelsTable initialModels={models} />
        </CardContent>
      </Card>
    </div>
  );
}
