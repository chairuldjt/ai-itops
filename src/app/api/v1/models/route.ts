import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey, extractApiKey, isModelAllowed } from "@/lib/gateway/api-key";
import { listEnabledModels } from "@/lib/gateway/model-resolver";
import { openaiErrorResponse } from "@/lib/gateway/response";

/**
 * GET /api/v1/models — list enabled models (OpenAI-compatible format).
 * Models are filtered by the API key's allowlist (if configured).
 */
export async function GET(request: NextRequest) {
  const raw = extractApiKey(request);
  if (!raw) return openaiErrorResponse(401, "Missing API key");
  const auth = await authenticateApiKey(raw);
  if (!auth.ok) return openaiErrorResponse(auth.status, auth.message);

  const rows = (await listEnabledModels()).filter((m) =>
    isModelAllowed(auth.apiKey, m.publicId),
  );
  return NextResponse.json({
    object: "list",
    data: rows.map((m) => ({
      id: m.publicId,
      object: "model",
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: m.provider ?? "ai-gateway",
      type: m.type,
      capabilities: m.capabilities,
      pricing: m.pricing,
    })),
  });
}
