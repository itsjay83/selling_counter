import { NextRequest, NextResponse } from "next/server";
import {
  appendSaleRow,
  getAggregates,
  getCsvBuffer,
  loadSales,
  resetSales,
  type PaymentMethod,
} from "@/lib/sales";

export async function GET() {
  const rows = loadSales();
  const { byProduct, byPayment } = getAggregates(rows);
  return NextResponse.json({ rows, byProduct, byPayment });
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

  appendSaleRow({
    상품명: productName,
    가격: Math.trunc(price),
    수량: Math.trunc(quantity),
    "현금/카드": paymentMethod as PaymentMethod,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  resetSales();
  return NextResponse.json({ ok: true });
}

export async function HEAD() {
  // For quick existence check
  const buf = getCsvBuffer();
  return new NextResponse(null, { headers: { "x-size": String(buf.byteLength) } });
}

