import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import {
  FEATURES,
  getItem,
  removeItem,
  useItemImages,
  type DocKind,
  type Item,
} from "@/lib/items-store";
import { pickPrimaryContent } from "@/lib/analysis-render";

function makeUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

function parsePurchaseDate(input: unknown): Date | null {
  if (!input) return null;
  const s = String(input).trim();
  // Korean: 2024년 5월 20일
  const kr = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (kr) return makeUtcDate(+kr[1], +kr[2], +kr[3]);
  // YYYY[-./]MM[-./]DD
  const ymd = s.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (ymd) return makeUtcDate(+ymd[1], +ymd[2], +ymd[3]);
  // YYYYMMDD
  const compact = s.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (compact) return makeUtcDate(+compact[1], +compact[2], +compact[3]);
  // DD[-./]MM[-./]YYYY
  const dmy = s.match(/\b(\d{1,2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{2,4})\b/);
  if (dmy) {
    let y = +dmy[3];
    if (y < 100) y += 2000;
    return makeUtcDate(y, +dmy[2], +dmy[1]);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

const DATE_VALUE_PATTERN = String.raw`\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일?|\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\b\d{8}\b|\b\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}\b`;
const PURCHASE_DATE_LABEL_PATTERN = new RegExp(
  String.raw`(?:구매\s*(?:날짜|일자|일)|구입\s*(?:날짜|일자|일)|수매\s*(?:날짜|일자|일)|결제\s*(?:날짜|일자|일)|거래\s*(?:날짜|일자|일시|일)|매입\s*(?:날짜|일자|일)|주문\s*(?:날짜|일자|일)|승인\s*(?:날짜|일자|일시|일)|영수증\s*(?:날짜|일자|일)|발행\s*(?:날짜|일자|일)|purchase\s*(?:date|day)|order\s*date|payment\s*date|transaction\s*date|receipt\s*date|approved\s*date|issued\s*date)\s*[:：\-–—]?\s*(${DATE_VALUE_PATTERN})`,
  "i",
);
const ANY_DATE_PATTERN = new RegExp(`(${DATE_VALUE_PATTERN})`, "i");

function pickDateFromText(text: unknown, allowAnyDate = false): string | undefined {
  if (typeof text !== "string" || !text.trim()) return undefined;
  const labeled = text.match(PURCHASE_DATE_LABEL_PATTERN)?.[1];
  if (labeled && parsePurchaseDate(labeled)) return labeled;
  if (!allowAnyDate) return undefined;
  const anyDate = text.match(ANY_DATE_PATTERN)?.[1];
  return anyDate && parsePurchaseDate(anyDate) ? anyDate : undefined;
}

function normalizeFieldKey(key: string): string {
  return key.replace(/[\s_-]+/g, "").toLowerCase();
}

function isPurchaseDateKey(key: string): boolean {
  const normalized = normalizeFieldKey(key);
  return (
    [
      "purchasedate",
      "purchaseday",
      "purchasedat",
      "orderdate",
      "paymentdate",
      "transactiondate",
      "receiptdate",
      "구매일",
      "구매일자",
      "구매날짜",
      "구입일",
      "구입일자",
      "구입날짜",
      "수매일",
      "수매일자",
      "수매날짜",
      "결제일",
      "결제일자",
      "결제날짜",
      "거래일",
      "거래일자",
      "거래일시",
      "매입일",
      "매입일자",
      "매입날짜",
      "주문일",
      "주문일자",
      "승인일",
      "승인일자",
      "승인일시",
      "영수증일",
      "영수증일자",
      "발행일",
      "발행일자",
    ].includes(normalized) ||
    (normalized.includes("purchase") && normalized.includes("date"))
  );
}

function isGenericDateKey(key: string): boolean {
  return ["date", "day", "일자", "날짜"].includes(normalizeFieldKey(key));
}

function hasReceiptSignal(item: Item): boolean {
  if (item.feature === "proof") return true;
  const hay = JSON.stringify({
    feature: item.feature,
    docKind: item.docKind,
    name: item.name,
    speech: item.speech,
    summary: item.summary,
    analysis: item.analysis,
  }).toLowerCase();
  return /receipt|영수증|구매|구입|수매|결제|거래|store_name|total_price|purchase_date/.test(hay);
}

function findPurchaseDateInAnalysis(data: unknown, kind?: DocKind): string | undefined {
  const allowGenericDate = kind === "receipt";
  const walk = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const keyMatches = isPurchaseDateKey(key) || (allowGenericDate && isGenericDateKey(key));
      if (keyMatches) {
        const direct =
          typeof entry === "string" || typeof entry === "number" ? String(entry) : undefined;
        if (direct && parsePurchaseDate(direct)) return direct;
      }
      const textDate = pickDateFromText(entry, allowGenericDate && typeof entry === "string");
      if (textDate) return textDate;
      if (entry && typeof entry === "object") {
        const nested = walk(entry);
        if (nested) return nested;
      }
    }
    return undefined;
  };
  return walk(data);
}

function resolvePurchaseDate(item: Item): string | undefined {
  const inferredKind =
    item.docKind === "receipt" || hasReceiptSignal(item) ? "receipt" : item.docKind;
  const storedDate = item.purchaseDate && parsePurchaseDate(item.purchaseDate) ? item.purchaseDate : undefined;
  const analysisDate = findPurchaseDateInAnalysis(item.analysis, inferredKind);
  const primaryDate = item.analysis
    ? pickDateFromText(pickPrimaryContent(item.analysis).value, inferredKind === "receipt")
    : undefined;
  const textDate =
    pickDateFromText(item.speech, inferredKind === "receipt") ||
    pickDateFromText(item.summary, inferredKind === "receipt") ||
    pickDateFromText(item.usage, inferredKind === "receipt");
  if (inferredKind === "receipt") return analysisDate || primaryDate || textDate || storedDate;
  if (storedDate) return storedDate;
  if (analysisDate) return analysisDate;
  if (item.analysis) {
    if (primaryDate) return primaryDate;
  }
  return textDate;
}

const WARRANTY_END_LABEL_PATTERN = new RegExp(
  String.raw`(?:보증\s*(?:종료(?:일)?|만료(?:일)?|끝(?:나는\s*날)?)|warranty\s*(?:end|expiry|expiration|until)|expires?(?:\s*on)?|valid\s*until|until)\s*[:：\-–—]?\s*(${DATE_VALUE_PATTERN})`,
  "i",
);

function isWarrantyEndKey(key: string): boolean {
  const n = normalizeFieldKey(key);
  return (
    [
      "warrantyend",
      "warrantyenddate",
      "warrantyuntil",
      "warrantyexpiry",
      "warrantyexpiration",
      "enddate",
      "expirydate",
      "expirationdate",
      "보증종료일",
      "보증종료",
      "보증만료일",
      "보증만료",
      "보증끝",
      "만료일",
      "종료일",
    ].includes(n) ||
    (n.includes("warranty") && (n.includes("end") || n.includes("until") || n.includes("expir")))
  );
}

function pickWarrantyDateFromText(text: unknown): string | undefined {
  if (typeof text !== "string" || !text.trim()) return undefined;
  const m = text.match(WARRANTY_END_LABEL_PATTERN)?.[1];
  return m && parsePurchaseDate(m) ? m : undefined;
}

function findWarrantyEndInAnalysis(data: unknown): string | undefined {
  const walk = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") return undefined;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (isWarrantyEndKey(key)) {
        const direct =
          typeof entry === "string" || typeof entry === "number" ? String(entry) : undefined;
        if (direct && parsePurchaseDate(direct)) return direct;
      }
      const textDate = pickWarrantyDateFromText(entry);
      if (textDate) return textDate;
      if (entry && typeof entry === "object") {
        const nested = walk(entry);
        if (nested) return nested;
      }
    }
    return undefined;
  };
  return walk(data);
}

function resolveWarrantyEnd(item: Item): string | undefined {
  if (item.warrantyUntil && parsePurchaseDate(item.warrantyUntil)) return item.warrantyUntil;
  const analysisDate = findWarrantyEndInAnalysis(item.analysis);
  if (analysisDate) return analysisDate;
  const labeled =
    pickWarrantyDateFromText(item.speech) ||
    pickWarrantyDateFromText(item.summary) ||
    pickWarrantyDateFromText(item.usage) ||
    pickWarrantyDateFromText(item.asInfo) ||
    (item.analysis ? pickWarrantyDateFromText(pickPrimaryContent(item.analysis).value) : undefined);
  if (labeled) return labeled;

  // Compute from purchase date + warranty period text (e.g. "3년", "3 years", "36개월").
  const purchase = parsePurchaseDate(resolvePurchaseDate(item));
  const period = findWarrantyPeriod(item);
  if (purchase && period) {
    const end = new Date(purchase);
    if (period.unit === "year") end.setUTCFullYear(end.getUTCFullYear() + period.value);
    else end.setUTCMonth(end.getUTCMonth() + period.value);
    return end.toISOString().slice(0, 10);
  }

  // Brute force: scan stringified analysis for any future date.
  if (item.analysis) {
    const hay = JSON.stringify(item.analysis);
    const today = Date.now();
    const matches = [...hay.matchAll(new RegExp(DATE_VALUE_PATTERN, "g"))];
    const future = matches
      .map((m) => parsePurchaseDate(m[0]))
      .filter((d): d is Date => !!d && d.getTime() > today)
      .sort((a, b) => a.getTime() - b.getTime());
    if (future[0]) return future[0].toISOString().slice(0, 10);
  }
  return undefined;
}

function findWarrantyPeriod(item: Item): { value: number; unit: "year" | "month" } | undefined {
  const fields = [item.asInfo, item.speech, item.summary, item.usage];
  if (item.analysis) fields.push(JSON.stringify(item.analysis));
  const text = fields.filter(Boolean).join(" ");
  if (!text) return undefined;
  const yr = text.match(/(\d+)\s*(?:년|years?|yrs?)\b/i);
  if (yr) return { value: +yr[1], unit: "year" };
  const mo = text.match(/(\d+)\s*(?:개월|months?|mos?)\b/i);
  if (mo) return { value: +mo[1], unit: "month" };
  return undefined;
}

export const Route = createFileRoute("/items/$id")({
  head: () => ({ meta: [{ title: "물건 상세 — 물건 도깨비" }] }),
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | undefined>();
  useEffect(() => {
    setItem(getItem(id));
  }, [id]);
  const { photo, characterUrl } = useItemImages(item?.id);

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Dokkaebi size={120} />
          <p className="mt-4 text-muted-foreground">앗! 도깨비가 이 물건을 찾지 못했어요.</p>
          <Link
            to="/my"
            className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            보관함으로
          </Link>
        </main>
      </div>
    );
  }

  function daysSinceText(purchaseDate?: string) {
    if (!purchaseDate) return "만난 날짜를 아직 몰라요";
    const purchase = parsePurchaseDate(purchaseDate);
    if (!purchase) return "만난 날짜를 아직 몰라요";
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((today - purchase.getTime()) / 86_400_000);
    const days = Math.max(1, diffDays);
    return `함께한 지 D+${days}일째!`;
  }

  const warrantyEnd = parsePurchaseDate(resolveWarrantyEnd(item));
  const todayUtc = (() => {
    const n = new Date();
    return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  })();
  const daysLeft = warrantyEnd
    ? Math.round((warrantyEnd.getTime() - todayUtc) / 86_400_000)
    : null;
  const ddayLabel =
    daysLeft === null
      ? null
      : daysLeft > 0
        ? `D-${daysLeft}`
        : daysLeft === 0
          ? "D-DAY"
          : `D+${Math.abs(daysLeft)}`;
  const ddayTone =
    daysLeft === null
      ? ""
      : daysLeft < 0
        ? "bg-destructive text-destructive-foreground"
        : daysLeft <= 30
          ? "bg-amber-500 text-white"
          : "bg-primary text-primary-foreground";
  const purchaseDate = resolvePurchaseDate(item);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20">
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="relative aspect-[4/3] bg-mint/40">
            {characterUrl || photo ? (
              <img src={characterUrl || photo} alt={item.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Dokkaebi size={140} />
              </div>
            )}
            {ddayLabel && (
              <div className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-soft ${ddayTone}`}>
                <span>⏰</span>
                <span>보증 {ddayLabel}</span>
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="text-xs font-semibold text-primary">
              {FEATURES[item.feature].emoji} {FEATURES[item.feature].label}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
            {item.brand && (
              <p className="text-sm text-muted-foreground">
                {item.brand} {item.model}
              </p>
            )}
          </div>
        </div>

        <div className="relative mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="absolute -top-2 left-10 size-4 rotate-45 border-l border-t border-border bg-card" />
          <p className="text-sm font-medium text-foreground/90">{daysSinceText(purchaseDate)}</p>
        </div>

        <Section title="도깨비 메시지">
          <p className="whitespace-pre-line text-sm text-foreground/80">
            {item.analysis
              ? pickPrimaryContent(item.analysis).value
              : item.speech || item.summary || item.usage || "—"}
          </p>
        </Section>

        <button
          onClick={async () => {
            await removeItem(item.id);
            navigate({ to: "/my" });
          }}
          className="mt-6 w-full rounded-full border border-destructive/40 bg-card py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
        >
          삭제하기
        </button>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
      <h2 className="mb-3 text-sm font-bold text-primary">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}
