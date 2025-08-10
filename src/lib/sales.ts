import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

export type PaymentMethod = "현금" | "카드";

export const CSV_COLUMNS = ["상품명", "가격", "수량", "현금/카드"] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

export type SaleRow = {
  상품명: string;
  가격: number;
  수량: number;
  "현금/카드": PaymentMethod | string;
};

const PROJECT_ROOT = process.cwd();
const DATA_DIR = (() => {
  const envDir = process.env.SALES_DATA_DIR;
  if (envDir && envDir.trim().length > 0) return path.resolve(envDir);
  // Vercel serverless has read-only FS except for /tmp
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return "/tmp/selling_counter_data";
  }
  return path.join(PROJECT_ROOT, "data");
})();
export const CSV_PATH = path.join(DATA_DIR, "sales.csv");

export function ensureDataDirExists(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

export function loadSales(): SaleRow[] {
  ensureDataDirExists();
  if (!fs.existsSync(CSV_PATH)) return [];
  const raw = fs.readFileSync(CSV_PATH, { encoding: "utf8" });
  const withoutBom = stripBom(raw);
  const parsed = Papa.parse<Record<string, unknown>>(withoutBom, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors && parsed.errors.length > 0) {
    // If parse errors occur, return best-effort rows
    console.warn("CSV parse errors:", parsed.errors);
  }
  const rows = parsed.data.map((r) => {
    const row: SaleRow = {
      상품명: String(r["상품명"] ?? "").trim(),
      가격: Number(r["가격"] ?? 0),
      수량: Number(r["수량"] ?? 0),
      "현금/카드": String(r["현금/카드"] ?? "").trim(),
    };
    return row;
  });
  return rows;
}

function unparseRows(rows: SaleRow[], includeHeader: boolean): string {
  return Papa.unparse({
    fields: CSV_COLUMNS as unknown as string[],
    data: rows.map((r) => [r.상품명, r.가격, r.수량, r["현금/카드"]]),
  }, { header: includeHeader });
}

export function appendSaleRow(row: SaleRow): void {
  ensureDataDirExists();
  const exists = fs.existsSync(CSV_PATH);
  if (!exists) {
    const content = "\ufeff" + unparseRows([row], true) + "\n";
    fs.writeFileSync(CSV_PATH, content, { encoding: "utf8" });
  } else {
    const line = unparseRows([row], false) + "\n";
    fs.appendFileSync(CSV_PATH, line, { encoding: "utf8" });
  }
}

export function resetSales(): void {
  ensureDataDirExists();
  if (fs.existsSync(CSV_PATH)) {
    fs.unlinkSync(CSV_PATH);
  }
}

export function getCsvBuffer(): Buffer {
  ensureDataDirExists();
  if (!fs.existsSync(CSV_PATH)) {
    // Return empty CSV with header
    const header = "\ufeff" + (CSV_COLUMNS as unknown as string[]).join(",") + "\n";
    return Buffer.from(header, "utf8");
  }
  return fs.readFileSync(CSV_PATH);
}

export function getAggregates(rows: SaleRow[]): {
  byProduct: Array<{ 상품명: string; 수량: number; 가격: number }>;
  byPayment: Array<{ "현금/카드": string; 수량: number }>;
} {
  const byProductMap = new Map<string, { 상품명: string; 수량: number; 가격: number }>();
  const byPaymentMap = new Map<string, { "현금/카드": string; 수량: number }>();

  for (const r of rows) {
    // by product
    const existingProduct = byProductMap.get(r.상품명);
    if (!existingProduct) {
      byProductMap.set(r.상품명, { 상품명: r.상품명, 수량: r.수량, 가격: r.가격 });
    } else {
      existingProduct.수량 += r.수량;
    }

    // by payment
    const paymentKey = r["현금/카드"] ?? "";
    const existingPayment = byPaymentMap.get(paymentKey);
    if (!existingPayment) {
      byPaymentMap.set(paymentKey, { "현금/카드": paymentKey, 수량: r.수량 });
    } else {
      existingPayment.수량 += r.수량;
    }
  }

  return {
    byProduct: Array.from(byProductMap.values()),
    byPayment: Array.from(byPaymentMap.values()),
  };
}

