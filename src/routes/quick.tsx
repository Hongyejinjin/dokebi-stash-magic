import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { addItem, updateItem, type DocKind, type Item } from "@/lib/items-store";

export const Route = createFileRoute("/quick")({
  head: () => ({ meta: [{ title: "통합 등록 — 물건 도깨비" }] }),
  component: QuickPage,
});

const API_ANALYZE = "https://hjinjin.app.n8n.cloud/webhook-test/my-hackerthon2";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function postImage(url: string, file: File): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append("photo", file, file.name);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
  const text = await res.text();
  return extractJson(text);
}

function extractJson(text: string): Record<string, unknown> {
  const tryParse = (s: string) => {
    const v = JSON.parse(s);
    if (Array.isArray(v)) return (v[0] ?? {}) as Record<string, unknown>;
    if (v && typeof v === "object") return v as Record<string, unknown>;
    return { summary: String(v) };
  };
  try { return tryParse(text); } catch {}
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\{\[]/);
  if (start !== -1) {
    const isArr = cleaned[start] === "[";
    const end = cleaned.lastIndexOf(isArr ? "]" : "}");
    if (end > start) {
      cleaned = cleaned.slice(start, end + 1);
      try { return tryParse(cleaned); } catch {}
      const repaired = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, "");
      try { return tryParse(repaired); } catch {}
    }
  }
  return { summary: text };
}

function pick(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

function detectKind(d: Record<string, unknown>): DocKind {
  const dt = typeof d?.document_type === "string" ? d.document_type.toLowerCase() : "";
  if (dt) {
    if (/receipt|영수증/.test(dt)) return "receipt";
    if (/warranty|보증/.test(dt)) return "warranty";
    if (/manual|설명서|사용/.test(dt)) return "manual";
    if (/repair|수리/.test(dt)) return "repair";
  }
  const hay = JSON.stringify(d).toLowerCase();
  if (/(warranty|보증)/.test(hay)) return "warranty";
  if (/(repair|수리|교체)/.test(hay)) return "repair";
  if (/(manual|설명서|사용법|usage|caution)/.test(hay)) return "manual";
  if (/(receipt|영수증|구매처|purchase_date|store_name|total_price|price|amount|구매금액)/.test(hay)) return "receipt";
  return "item";
}

const KIND_LABEL: Record<DocKind, { label: string; emoji: string }> = {
  receipt:  { label: "영수증", emoji: "🧾" },
  manual:   { label: "설명서", emoji: "📖" },
  warranty: { label: "보증서", emoji: "📜" },
  repair:   { label: "수리 내역", emoji: "🛠️" },
  item:     { label: "물건",  emoji: "📦" },
};

const FIELD_LABEL: Record<string, string> = {
  purchase_date: "구매일",
  store_name: "상호명",
  total_price: "결제금액",
  product_name: "상품명",
  brand: "브랜드",
  model: "모델",
  serial: "시리얼",
  warranty_period: "보증 기간",
  warranty_start: "보증 시작일",
  warranty_end: "보증 만료일",
  document_type: "문서 종류",
  summary: "요약",
  usage: "사용법",
  cautions: "주의사항",
  care: "관리법",
  name: "이름",
  date: "일자",
  place: "장소",
  store: "상호명",
  price: "금액",
  amount: "금액",
};

function labelize(key: string): string {
  if (FIELD_LABEL[key]) return FIELD_LABEL[key];
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  const s = String(value);
  if (/price|amount|금액/i.test(key) && /^\d+(\.\d+)?$/.test(s)) {
    return `${Number(s).toLocaleString()}원`;
  }
  return s;
}

function toEntries(d: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => [labelize(k), formatValue(k, v)] as [string, string]);
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickPrimaryContent(
  d: Record<string, unknown> | null,
): { value: string; sourceKey: string } {
  if (!d) return { value: "데이터 없음", sourceKey: "—" };
  const order = ["markdown", "html", "text"];

  const search = (obj: unknown, path: string[] = []): { value: string; sourceKey: string } | null => {
    if (!obj || typeof obj !== "object") return null;
    const rec = obj as Record<string, unknown>;
    for (const key of order) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) {
        const fullKey = [...path, key].join(".");
        const out = key === "html" ? htmlToText(v) : v;
        return { value: out.trim() || "데이터 없음", sourceKey: fullKey };
      }
    }
    for (const [k, v] of Object.entries(rec)) {
      if (v && typeof v === "object") {
        const found = search(v, [...path, k]);
        if (found) return found;
      }
    }
    return null;
  };

  return search(d) ?? { value: "데이터 없음", sourceKey: "—" };
}

function summarize(kind: DocKind, d: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (l: string, v: string) => { if (v) out.push(`${l}: ${v}`); };
  if (kind === "receipt") {
    push("구매일",   pick(d, "purchase_date", "date", "purchaseDate", "구매일"));
    push("상호명",   pick(d, "store_name", "place", "store", "구매처"));
    const amount = pick(d, "total_price", "price", "amount", "구매금액");
    if (amount) push("결제금액", /원$/.test(amount) ? amount : `${amount}원`);
    push("상품명",   pick(d, "name", "product", "productName", "상품명"));
  } else if (kind === "manual") {
    push("사용법", pick(d, "usage", "사용법", "사용방법"));
    push("주의사항", pick(d, "cautions", "warning", "주의사항"));
    push("관리법", pick(d, "care", "maintenance", "관리방법"));
  } else if (kind === "warranty") {
    push("보증 기간",  pick(d, "period", "보증기간"));
    push("보증 시작일", pick(d, "start", "startDate", "보증시작일"));
    push("보증 만료일", pick(d, "end", "endDate", "warrantyUntil", "보증종료일"));
  } else if (kind === "repair") {
    push("수리 일자", pick(d, "date", "수리일자"));
    push("수리 내역", pick(d, "note", "detail", "수리내역"));
    push("교체 부품", pick(d, "parts", "교체부품"));
  } else {
    push("이름",   pick(d, "name", "product", "productName"));
    push("브랜드", pick(d, "brand", "브랜드"));
  }
  if (!out.length) out.push("내용을 한 줄로 정리하기 어려웠어요. 상세에서 확인해주세요!");
  return out;
}

function QuickPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [kind, setKind] = useState<DocKind>("item");
  const [bullets, setBullets] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [characterUrl, setCharacterUrl] = useState<string>();
  const [characterReady, setCharacterReady] = useState(false);

  async function start() {
    if (!photo || !photoFile) { setTried(true); return; }
    setStep(1);

    let data: Record<string, unknown>;
    try {
      data = await postImage(API_ANALYZE, photoFile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지 분석에 실패했어요");
      setStep(0);
      return;
    }

    const summary = pick(data, "summary", "요약");
    const hasReceipt =
      pick(data, "purchase_date") || pick(data, "store_name") || pick(data, "total_price");
    const k: DocKind = hasReceipt ? "receipt" : detectKind(data);
    const lines = summary ? [summary] : summarize(k, data);
    const name =
      pick(data, "product_name", "name", "product", "productName", "상품명", "store_name") ||
      "내 새 친구";
    const brand = pick(data, "brand", "브랜드");

    const saved = await addItem({
      feature: "auto",
      docKind: k,
      name,
      brand,
      photo,
      purchaseDate:  pick(data, "purchase_date", "date", "purchaseDate", "구매일") || undefined,
      purchasePlace: pick(data, "store_name", "place", "store", "구매처") || undefined,
      price:         pick(data, "total_price", "price", "amount", "구매금액") || undefined,
      warrantyUntil: pick(data, "warranty_end", "end", "endDate", "warrantyUntil", "보증종료일") || undefined,
      usage:         pick(data, "usage", "사용법", "사용방법") || undefined,
      cautions:      pick(data, "cautions", "warning", "주의사항") || undefined,
      summary:       summary || undefined,
      careCycle:     pick(data, "care", "maintenance", "관리방법") || undefined,
      speech: lines.join(" · "),
    });

    setItem(saved);
    setKind(k);
    setBullets(lines);
    setAnalysis(data);
    setStep(2);

    // Reuse analyze response for character image if present; no extra call.
    const url = pick(data, "characterUrl", "url", "image", "character");
    if (url) {
      setCharacterUrl(url);
      await updateItem(saved.id, { characterUrl: url });
    }
    setCharacterReady(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20">
        {step === 0 && (
          <section className="mt-6 animate-float-up">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">✨ 통합 등록</span>
            <h1 className="mt-3 text-2xl font-bold">사진 한 장만 올려주세요!</h1>
            <p className="mt-1 text-sm text-muted-foreground">물건이든 영수증·보증서·설명서든 도깨비가 알아서 분류해요.</p>
            <label className="mt-5 block cursor-pointer rounded-3xl border-2 border-dashed border-border bg-mint/30 p-10 text-center transition hover:bg-mint/50">
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) { setPhotoFile(f); setPhoto(await readFile(f)); setTried(false); }
              }} />
              {photo ? (
                <img src={photo} alt="업로드" className="mx-auto max-h-56 rounded-2xl object-contain" />
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <div className="text-sm font-semibold">탭하여 사진 추가</div>
                  <div className="text-xs text-muted-foreground">PNG · JPG · PDF</div>
                </div>
              )}
            </label>
            {tried && !photo && (
              <div className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
                등록되지 않았어요!
              </div>
            )}
            <button
              onClick={start}
              disabled={!photo}
              className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft transition enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              도깨비에게 맡기기
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-16 flex flex-col items-center text-center">
            <Dokkaebi size={160} swinging />
            <p className="mt-6 text-base font-semibold text-foreground">이미지를 분석 중입니다...</p>
            <div className="mt-4 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 animate-sparkle rounded-full bg-primary" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </section>
        )}

        {step === 2 && item && (
          <section className="mt-6 animate-float-up">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {KIND_LABEL[kind].emoji} {KIND_LABEL[kind].label} 인식 완료
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold">{item.name} 친구가 도착했어요!</h1>

            <div className="mt-6 flex items-end justify-center gap-3">
              <div className="relative">
                <div className="size-32 overflow-hidden rounded-3xl border-4 border-mint bg-mint/40 shadow-soft">
                  {characterUrl ? (
                    <img src={characterUrl} alt={item.name} className="size-full object-cover" />
                  ) : !characterReady ? (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      <span className="animate-pulse">✨ 변신 중…</span>
                    </div>
                  ) : (
                    <img src={photo} alt={item.name} className="size-full object-cover" />
                  )}
                </div>
                <div className="mt-1 text-center text-xs font-semibold">{item.name}</div>
              </div>
              <Dokkaebi size={120} />
            </div>

            {/* Speech bubble */}
            <div className="relative mx-auto mt-4 max-w-sm rounded-3xl border border-border bg-card p-5 shadow-soft">
              <div className="absolute -top-2 left-10 size-4 rotate-45 border-l border-t border-border bg-card" />
              <div className="text-xs font-semibold text-primary">도깨비가 정리해줬어요!</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Full analysis (dynamic) */}
            {analysis && toEntries(analysis).length > 0 && (
              <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-border bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold text-primary">분석 결과</div>
                <dl className="mt-2 divide-y divide-border/60 text-sm">
                  {toEntries(analysis).map(([k, v]) => (
                    <div key={k} className="flex gap-3 py-2">
                      <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="flex-1 break-words text-foreground/90">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Primary content (markdown > html > text) */}
            {analysis && (() => {
              const { value, sourceKey } = pickPrimaryContent(analysis);
              return (
                <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-border bg-card p-5 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-primary">주요 내용</div>
                    <div className="text-[10px] text-muted-foreground">source: {sourceKey}</div>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-foreground/90">
                    {value}
                  </pre>
                </div>
              );
            })()}

            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => navigate({ to: "/items/$id", params: { id: item.id } })}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
              >
                상세 보기
              </button>
              <button
                onClick={() => navigate({ to: "/my" })}
                className="rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-foreground"
              >
                보관함으로
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}