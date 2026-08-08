import { redirect } from "next/navigation";

// The legacy /dashboard area has been merged into the unified console.
export default function DashboardPage() {
  redirect("/console/dashboard");
}
