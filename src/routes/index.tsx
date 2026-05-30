import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Dokkaebi, toneFromKey } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { FEATURES, useItems } from "@/lib/items-store";
import { ItemThumb } from "@/components/ItemThumb";
import { hasWarrantyDday } from "@/lib/item-dates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "물건 도깨비 — AI가 정리해주는 내 물건 보관함" },
      { name: "description", content: "고가 물건의 증빙·보증·사용법·분실 방지를 도깨비가 똑똑하게 관리해드려요." },
      { property: "og:title", content: "물건 도깨비" },
      { property: "og:description", content: "AI 기반 귀여운 물건 관리 서비스" },
    ],
  }),
  component: Index,
});

function Index() {
  const items = useItems();
  const warrantyActive = items.filter(hasWarrantyDday).length;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        {/* Hero */}
        <section className="relative mt-6 overflow-hidden rounded-[2rem] bg-gradient-hero p-8 shadow-soft sm:p-12">
          <div className="absolute -right-6 -top-6 size-40 rounded-full bg-primary-glow/30 blur-3xl" />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary">
                ✨ AI 물건 관리 도깨비
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                귀찮은 물건 관리,
                <br />
                도깨비가 대신 해드릴게요
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                영수증·보증서·설명서를 업로드하면 AI가 알아서 정리하고,
                아이템을 귀여운 캐릭터로 변신시켜드려요.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/register" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.02]">
                  물건 등록하기
                </Link>
                <Link to="/my" className="rounded-full bg-white/80 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-white">
                  나의 도깨비 보기
                </Link>
              </div>
            </div>
            <Dokkaebi size={170} />
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="text-xs font-semibold text-muted-foreground">등록된 물건</div>
            <div className="mt-1 text-3xl font-bold text-foreground">
              {items.length}<span className="ml-1 text-base font-semibold text-muted-foreground">개</span>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="text-xs font-semibold text-muted-foreground">보증 중인 물건</div>
            <div className="mt-1 text-3xl font-bold text-primary">
              {warrantyActive}<span className="ml-1 text-base font-semibold text-muted-foreground">개</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">원하는 관리 기능을 골라보세요</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(FEATURES) as (keyof typeof FEATURES)[]).map((k) => (
              <Link
                key={k}
                to="/register"
                search={{ feature: k }}
                className="group rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="text-3xl">{FEATURES[k].emoji}</div>
                <div className="mt-3 text-sm font-bold text-foreground">{FEATURES[k].label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{FEATURES[k].desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">최근 관리 중인 물건</h2>
            <Link to="/my" className="text-xs font-semibold text-primary hover:underline">전체보기 →</Link>
          </div>
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-mint/40 p-10 text-center">
              <Dokkaebi size={90} />
              <p className="mt-3 text-sm text-muted-foreground">
                아직 등록된 물건이 없어요. 첫 물건을 도깨비에게 맡겨보세요!
              </p>
              <Link to="/register" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                지금 등록하기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.slice(0, 6).map((it) => (
                <Link key={it.id} to="/items/$id" params={{ id: it.id }} className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition hover:-translate-y-1">
                  <div className="aspect-square overflow-hidden bg-mint/40">
                    <ItemThumb id={it.id} name={it.name} />
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-primary">{FEATURES[it.feature].emoji} {FEATURES[it.feature].label}</div>
                    <div className="truncate text-sm font-bold">{it.name}</div>
                  </div>
                  <div className="pointer-events-none absolute bottom-1 right-1 drop-shadow-sm">
                    <Dokkaebi size={44} tone={toneFromKey(it.id)} swinging />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
