import type { ReactElement } from "react";

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

export function labelize(key: string): string {
  if (FIELD_LABEL[key]) return FIELD_LABEL[key];
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatValue(key: string, value: unknown): string {
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

export function toEntries(d: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => [labelize(k), formatValue(k, v)] as [string, string]);
}

export function htmlToText(html: string): string {
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

const PRIMARY_KEYS = ["markdown", "html", "text", "output", "content", "result", "message", "answer", "response", "summary", "요약"];

export function pickPrimaryContent(d: unknown): { value: string; sourceKey: string } {
  if (d == null) return { value: "데이터 없음", sourceKey: "—" };
  if (typeof d === "string") {
    const s = d.trim();
    return { value: s || "데이터 없음", sourceKey: "(root)" };
  }
  const search = (obj: unknown, path: string[] = []): { value: string; sourceKey: string } | null => {
    if (obj == null) return null;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const found = search(obj[i], [...path, `[${i}]`]);
        if (found) return found;
      }
      return null;
    }
    if (typeof obj !== "object") return null;
    const rec = obj as Record<string, unknown>;
    for (const key of PRIMARY_KEYS) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) {
        const fullKey = [...path, key].join(".") || key;
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
    let best: { value: string; sourceKey: string } | null = null;
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v === "string" && v.trim()) {
        const cand = v.trim();
        if (!best || cand.length > best.value.length) {
          best = { value: cand, sourceKey: [...path, k].join(".") || k };
        }
      }
    }
    return best;
  };
  return search(d) ?? { value: "데이터 없음", sourceKey: "—" };
}

export function AnalysisView({ data }: { data: Record<string, unknown> }): ReactElement {
  const entries = toEntries(data);
  const primary = pickPrimaryContent(data);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-primary">주요 내용</div>
          <div className="text-[10px] text-muted-foreground">source: {primary.sourceKey}</div>
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-foreground/90">
          {primary.value}
        </pre>
      </div>
      {entries.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs font-semibold text-primary">분석 결과</div>
          <dl className="mt-2 divide-y divide-border/60 text-sm">
            {entries.map(([k, v]) => (
              <div key={k} className="flex gap-3 py-2">
                <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="flex-1 break-words text-foreground/90">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <details className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <summary className="cursor-pointer text-xs font-semibold text-primary">원본 응답 (JSON)</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-muted/40 p-3 text-xs text-foreground/80">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}