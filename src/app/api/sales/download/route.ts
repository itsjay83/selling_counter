import { NextResponse } from "next/server";
import { getCsvBuffer } from "@/lib/sales";

export async function GET() {
  const buf = getCsvBuffer();
  const data = new Uint8Array(buf);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"sales.csv\"",
      "Cache-Control": "no-store",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

