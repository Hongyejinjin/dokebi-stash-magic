import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { FEATURES, type FeatureKey, useItems } from "@/lib/items-store";

export const Route = createFileRoute("/my")({
  head: () => ({ meta: [{ title: "나의 도깨비 — 물건 보관함" }] }),
  component: MyPage,
});

function MyPage() {
  const items = useItems();
  const [filter, setFilter] = useState<FeatureKey | "all">("all");
  const filtered = filter === "all" ? items : items.filter((i) => i.feature === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mt-6 flex items-center gap-4">
          <Dokkaebi size={64} />
          <div>
            <h1 className="text-2xl font-bold">나의 도깨비</h1>
            <p className="text-sm text-muted-foreground">총 {items.length}개의 물건을 도깨비가 지키고 있어요.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>전체</Chip>
          {(Object.keys(FEATURES) as FeatureKey[]).map((k) => (
            <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {FEATURES[k].emoji} {FEATURES[k].label}
            </Chip>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-mint/30 p-10 text-center">
            <Dokkaebi size={100} />
            <p className="mt-3 text-sm text-muted-foreground">아직 이 보관함은 비어있어요.</p>
            <Link to="/register" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">물건 등록하기</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((it) => (
              <Link key={it.id} to="/items/$id" params={{ id: it.id }} className="group overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
                <div className="aspect-square overflow-hidden bg-mint/40">
                  {it.characterUrl || it.photo ? (
                    <img src={it.characterUrl || it.photo} alt={it.name} className="size-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex size-full items-center justify-center"><Dokkaebi size={80} /></div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-xs text-primary">{FEATURES[it.feature].emoji} {FEATURES[it.feature].label}</div>
                  <div className="truncate text-sm font-bold">{it.name || "이름 없음"}</div>
                  {it.brand && <div className="truncate text-xs text-muted-foreground">{it.brand}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={
        "rounded-full px-4 py-1.5 text-xs font-semibold transition " +
        (active ? "bg-primary text-primary-foreground shadow-soft" : "bg-muted text-muted-foreground hover:bg-mint/60")
      }>
      {children}
    </button>
  );
}