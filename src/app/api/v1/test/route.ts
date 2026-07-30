import { NextRequest, NextResponse } from "next/server";

// FIX #9: Only expose test route in development.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, route: "GET /api/v1/test" });
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.text();
  return NextResponse.json({
    ok: true,
    route: "POST /api/v1/test",
    bodyLen: body.length,
    auth: req.headers.get("authorization") ?? "none",
  });
}
