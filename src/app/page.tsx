"use client";

import { useEffect, useMemo, useState } from "react";

type Product = { name: string; price: number };
type PaymentMethod = "현금" | "카드";

type SaleRow = {
  상품명: string;
  가격: number;
  수량: number;
  "현금/카드": string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("현금");

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [byProduct, setByProduct] = useState<Array<{ 상품명: string; 수량: number; 가격: number }>>([]);
  const [byPayment, setByPayment] = useState<Array<{ "현금/카드": string; 수량: number }>>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshSales();
  }, []);

  async function refreshSales() {
    const res = await fetch("/api/sales", { cache: "no-store" });
    const data = await res.json();
    setRows(data.rows ?? []);
    setByProduct(data.byProduct ?? []);
    setByPayment(data.byPayment ?? []);
  }

  function addOrUpdateProduct() {
    const trimmed = nameInput.trim();
    if (!trimmed || priceInput === "") return;
    setProducts((prev) => {
      const existingIndex = prev.findIndex((p) => p.name === trimmed);
      const next = [...prev];
      if (existingIndex >= 0) {
        next[existingIndex] = { name: trimmed, price: Number(priceInput) };
      } else {
        next.push({ name: trimmed, price: Number(priceInput) });
      }
      return next;
    });
    setNameInput("");
    setPriceInput("");
  }

  function removeProduct(name: string) {
    setProducts((prev) => prev.filter((p) => p.name !== name));
  }

  async function recordSale(product: Product, quantity: number) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          price: product.price,
          quantity,
          paymentMethod,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(`기록 실패: ${res.status} ${msg}`);
        return;
      }
      await refreshSales();
      setSuccessMessage(`기록됨: ${product.name} x${quantity} (${paymentMethod})`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      alert(`기록 중 오류가 발생했습니다.`);
    }
  }

  async function resetAll() {
    await fetch("/api/sales", { method: "DELETE" });
    await refreshSales();
  }

  const totalRows = useMemo(() => rows.length, [rows]);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">🧾 판매 카운터</h1>
          <p className="text-sm text-gray-500">
            상품과 가격을 등록하고, 수량과 결제수단을 선택해 판매를 기록하세요. 기록은 CSV로 저장됩니다.
          </p>
        </div>
      </header>

      {successMessage && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm">
          {successMessage}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <aside className="md:col-span-1 space-y-6">
          <section className="border rounded-lg p-4">
            <h2 className="font-medium mb-3">설정</h2>
            <div className="flex gap-3">
              <label className={`flex-1 cursor-pointer border rounded px-3 py-2 text-center ${paymentMethod === "현금" ? "bg-gray-100 border-gray-400 text-black" : "text-gray-600"}`}>
                <input
                  type="radio"
                  name="payment"
                  className="hidden"
                  checked={paymentMethod === "현금"}
                  onChange={() => setPaymentMethod("현금")}
                />
                현금
              </label>
              <label className={`flex-1 cursor-pointer border rounded px-3 py-2 text-center ${paymentMethod === "카드" ? "bg-gray-100 border-gray-400 text-black" : "text-gray-600"}`}>
                <input
                  type="radio"
                  name="payment"
                  className="hidden"
                  checked={paymentMethod === "카드"}
                  onChange={() => setPaymentMethod("카드")}
                />
                카드
              </label>
            </div>
          </section>

          <section className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">상품 추가</h3>
            <div className="space-y-3">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="상품명"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                placeholder="가격"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <button
                onClick={addOrUpdateProduct}
                className="w-full bg-black text-white rounded py-2"
              >
                상품 등록
              </button>
            </div>

            <button
              className="mt-3 text-sm text-gray-600 underline"
              onClick={() => {
                setProducts((prev) => {
                  const base = prev.filter((p) => !["콜라", "사이다", "과자", "컵라면"].includes(p.name));
                  return [
                    ...base,
                    { name: "콜라", price: 2000 },
                    { name: "사이다", price: 2000 },
                    { name: "과자", price: 1500 },
                    { name: "컵라면", price: 1200 },
                  ];
                });
              }}
            >
              샘플 상품 불러오기
            </button>
          </section>
        </aside>

        <main className="md:col-span-2 space-y-6">
          <section className="border rounded-lg p-4">
            <h2 className="font-medium mb-3">상품 목록</h2>
            {products.length === 0 ? (
              <div className="text-sm text-gray-600">좌측에서 상품을 등록하세요.</div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <ProductRow
                    key={product.name}
                    product={product}
                    onRecord={(q) => recordSale(product, q)}
                    onRemove={() => removeProduct(product.name)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="border rounded-lg p-4">
            <header className="flex items-center justify-between mb-3">
              <h2 className="font-medium">판매 기록</h2>
              <div className="text-sm text-gray-500">총 {totalRows}건</div>
            </header>
            {rows.length === 0 ? (
              <div className="text-sm text-gray-600">아직 기록이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">상품명</th>
                      <th className="py-2">가격</th>
                      <th className="py-2">수량</th>
                      <th className="py-2">현금/카드</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">{r.상품명}</td>
                        <td className="py-2">{Number(r.가격).toLocaleString()}원</td>
                        <td className="py-2">{r.수량}</td>
                        <td className="py-2">{r["현금/카드"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {rows.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-700">요약 (상품별/결제수단별)</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="font-medium mb-2">상품별 합계</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2">상품명</th>
                            <th className="py-2">수량 합계</th>
                            <th className="py-2">가격</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byProduct.map((r) => (
                            <tr key={r.상품명} className="border-b last:border-0">
                              <td className="py-2">{r.상품명}</td>
                              <td className="py-2">{r.수량}</td>
                              <td className="py-2">{r.가격.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">결제수단별 합계</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2">현금/카드</th>
                            <th className="py-2">수량 합계</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byPayment.map((r, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2">{r["현금/카드"]}</td>
                              <td className="py-2">{r.수량}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </details>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <a
                href="/api/sales/download"
                className="text-center border rounded py-2"
              >
                CSV 다운로드
              </a>
              <button onClick={resetAll} className="border rounded py-2">
                전체 기록 초기화
              </button>
            </div>
          </section>
        </main>
      </div>
      <footer className="mt-6 text-xs text-gray-500">데이터 파일: /data/sales.csv</footer>
    </div>
  );
}

function ProductRow({
  product,
  onRecord,
  onRemove,
}: {
  product: Product;
  onRecord: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [quantity, setQuantity] = useState<number>(1);
  return (
    <div className="grid grid-cols-12 items-center gap-2 border rounded p-2">
      <div className="col-span-4">{product.name}</div>
      <div className="col-span-2">{product.price.toLocaleString()}원</div>
      <div className="col-span-3">
        <input
          type="number"
          min={1}
          className="w-full border rounded px-2 py-1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
        />
      </div>
      <div className="col-span-2">
        <button className="w-full bg-black text-white rounded py-1 border border-gray-300" onClick={() => onRecord(quantity)}>
          기록
        </button>
      </div>
      <div className="col-span-1">
        <button className="w-full border rounded py-1" onClick={onRemove}>
          삭제
        </button>
      </div>
    </div>
  );
}

