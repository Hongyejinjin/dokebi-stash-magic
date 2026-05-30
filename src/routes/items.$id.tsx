import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { FEATURES, getItem, removeItem, useItemImages, type Item } from "@/lib/items-store";
import { AnalysisView } from "@/lib/analysis-render";

export const Route = createFileRoute("/items/$id")({
  head: () => ({ meta: [{ title: "물건 상세 — 물건 도깨비" }] }),
  component: ItemDetail,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | undefined>();
  useEffect(() => { setItem(getItem(id)); }, [id]);
  const { photo, characterUrl } = useItemImages(item?.id);

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Dokkaebi size={120} />
          <p className="mt-4 text-muted-foreground">앗! 도깨비가 이 물건을 찾지 못했어요.</p>
          <Link to="/my" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">보관함으로</Link>
        </main>
      </div>
    );
  }

  const daysLeft = item.warrantyUntil
    ? Math.ceil((new Date(item.warrantyUntil).getTime() - Date.now()) / 86400_000)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20">
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="aspect-[4/3] bg-mint/40">
            {characterUrl || photo ? (
              <img src={characterUrl || photo} alt={item.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center"><Dokkaebi size={140} /></div>
            )}
          </div>
          <div className="p-5">
            <div className="text-xs font-semibold text-primary">
              {FEATURES[item.feature].emoji} {FEATURES[item.feature].label}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{item.name}</h1>
            {item.brand && <p className="text-sm text-muted-foreground">{item.brand} {item.model}</p>}
          </div>
        </div>

        {daysLeft !== null && (
          <div className="mt-4 rounded-3xl bg-gradient-hero p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⏰</div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">보증 만료까지</div>
                <div className="text-lg font-bold text-foreground">
                  {daysLeft > 0 ? `D-${daysLeft}` : "보증 만료됨"}
                </div>
              </div>
            </div>
          </div>
        )}

        <Section title="물건 프로필">
          <Row label="브랜드/상품명" value={[item.brand, item.name].filter(Boolean).join(" ") || item.name} />
          <Row label="구매 날짜" value={item.purchaseDate} />
          <Row label="구매처" value={item.purchasePlace} />
          <Row label="구매 금액" value={item.price} />
          <Row label="보증 기간" value={item.warrantyUntil} />
        </Section>

        <Section title="설명서 요약">
          <p className="whitespace-pre-line text-sm text-foreground/80">
            {item.summary || item.usage || "—"}
          </p>
        </Section>

        <Section title="도깨비 메시지">
          <p className="whitespace-pre-line text-sm text-foreground/80">
            {item.speech || "—"}
          </p>
        </Section>

        {item.analysis && (
          <section className="mt-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-primary">n8n 원본 분석</h2>
            <AnalysisView data={item.analysis} />
          </section>
        )}

        <button
          onClick={async () => { await removeItem(item.id); navigate({ to: "/my" }); }}
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