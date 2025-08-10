import { NextRequest, NextResponse } from "next/server";
import {
  appendSaleRow,
  getAggregates,
  type PaymentMethod,
  loadSales,
  resetSales,
} from "@/lib/sales";

export async function GET() {
  const rows = await loadSales();
  const { byProduct, byPayment } = getAggregates(rows);
  return NextResponse.json(
    { rows, byProduct, byPayment },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productName, price, quantity, paymentMethod } = body ?? {};

  if (
    typeof productName !== "string" ||
    typeof price !== "number" ||
    typeof quantity !== "number" ||
    (paymentMethod !== "현금" && paymentMethod !== "카드")
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await appendSaleRow({
    상품명: productName,
    가격: Math.trunc(price),
    수량: Math.trunc(quantity),
    "현금/카드": paymentMethod as PaymentMethod,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  await resetSales();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

// no extra exports

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const preferredRegion = "home";

