import { redirect } from "next/navigation";

// The legacy /dashboard/keys page has been merged into the unified console.
export default function DashboardKeysPage() {
  redirect("/console/api-keys");
}
