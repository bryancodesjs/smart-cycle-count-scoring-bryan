import { NextResponse } from "next/server";

const API_BASE =
  process.env.API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3001";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  try {
    const res = await fetch(
      `${API_BASE}/audits/bins/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );
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
