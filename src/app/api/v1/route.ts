// GET /api/v1 — bare base-URL alias for the model list.
// Some clients probe the base URL directly; 9router likewise serves the model
// list here. Delegates to the authenticated GET /api/v1/models handler.
export { GET } from "@/app/api/v1/models/route";
