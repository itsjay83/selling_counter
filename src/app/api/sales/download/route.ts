import { NextResponse } from "next/server";
import { getCsvBuffer } from "@/lib/sales";

export async function GET() {
  const buf = getCsvBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"sales.csv\"",
      "Cache-Control": "no-store",
    },
  });
}

