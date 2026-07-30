import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAllModels } from "./models/actions";
import { ModelsTable } from "./models/models-table";
import { ModelFormDialog } from "./models/model-form-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — AI Gateway" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const models = await listAllModels();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session.user.name}. You have {models.length} models.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              Configure name mapping, pricing, capabilities, and image policies.
            </CardDescription>
          </div>
          <ModelFormDialog />
        </CardHeader>
        <CardContent className="p-0">
          <ModelsTable initialModels={models} />
        </CardContent>
      </Card>
    </div>
  );
}
