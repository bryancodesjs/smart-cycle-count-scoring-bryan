import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const res = await fetch(`${API_BASE}/pallets/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "API unavailable", code: "API_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
