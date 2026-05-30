import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import {
  FEATURES,
  getItem,
  removeItem,
  useItemImages,
  type Item,
} from "@/lib/items-store";
import { parsePurchaseDate, resolvePurchaseDate, resolveWarrantyEnd } from "@/lib/item-dates";

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
