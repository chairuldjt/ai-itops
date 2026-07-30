import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, route: "GET /api/v1/test" });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return NextResponse.json({
    ok: true,
    route: "POST /api/v1/test",
    bodyLen: body.length,
    auth: req.headers.get("authorization") ?? "none",
  });
}
