import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

async function proxy(
  path: string,
  init?: RequestInit,
): Promise<NextResponse> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
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

export async function POST() {
  return proxy("/scores/recompute", { method: "POST" });
}
