import { createFileRoute, Link } from "@tanstack/react-router";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { ItemThumb } from "@/components/ItemThumb";
import { useItems, type Item } from "@/lib/items-store";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "보증기한 알림 — 물건 도깨비" },
      { name: "description", content: "등록한 물건의 보증 종료일까지 남은 D-day를 한눈에 확인하세요." },
    ],
  }),
  component: AlertsPage,
});

function parseWarrantyDate(raw?: string): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const ko = s.match(/(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})/);
  if (ko) {
    const [, y, m, d] = ko;
    return makeUtc(+y, +m, +d);
  }
  const iso = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return makeUtc(+y, +m, +d);
  }
  const dmy = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return makeUtc(+y, +m, +d);
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    return makeUtc(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  }
  return null;
}

function makeUtc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d));
}

function todayUtc() {
  const now = new Date();
  return makeUtc(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

type Row = { item: Item; end: Date; diffDays: number };

function computeRows(items: Item[]): Row[] {
  const today = todayUtc().getTime();
  const rows: Row[] = [];
  for (const item of items) {
    const end = parseWarrantyDate(item.warrantyUntil);
    if (!end) continue;
    const diffDays = Math.round((end.getTime() - today) / 86400000);
    rows.push({ item, end, diffDays });
  }
  rows.sort((a, b) => a.diffDays - b.diffDays);
  return rows;
}

function ddayBadge(diffDays: number) {
  if (diffDays === 0) return { text: "D-DAY", tone: "warn" as const };
  if (diffDays < 0) return { text: `D+${Math.abs(diffDays)}`, tone: "expired" as const };
  return { text: `D-${diffDays}`, tone: diffDays <= 30 ? ("warn" as const) : ("ok" as const) };
}

function toneClass(tone: "ok" | "warn" | "expired") {
  if (tone === "expired") return "bg-destructive/15 text-destructive";
  if (tone === "warn") return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-primary/10 text-primary";
}

function formatDate(d: Date) {
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

function AlertsPage() {
  const items = useItems();
  const rows = computeRows(items);
  const missing = items.filter((i) => !parseWarrantyDate(i.warrantyUntil)).length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20">
        <div className="mt-6 flex items-center gap-4">
          <Dokkaebi size={64} />
          <div>
            <h1 className="text-2xl font-bold">⏰ 보증기한 알림</h1>
            <p className="text-sm text-muted-foreground">
              보증 종료일까지 남은 D-day를 도깨비가 알려드려요.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border bg-mint/30 p-10 text-center">
            <Dokkaebi size={100} />
            <p className="mt-3 text-sm text-muted-foreground">
              아직 보증 종료일이 등록된 물건이 없어요.
            </p>
            <Link
              to="/register"
              search={{ feature: "warranty" }}
              className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              보증서 등록하기
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {rows.map(({ item, end, diffDays }) => {
                const badge = ddayBadge(diffDays);
                return (
                  <li key={item.id}>
                    <Link
                      to="/items/$id"
                      params={{ id: item.id }}
                      className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
                    >
                      <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-mint/40">
                        <ItemThumb id={item.id} name={item.name} className="size-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{item.name || "이름 없음"}</div>
                        {item.brand && (
                          <div className="truncate text-xs text-muted-foreground">{item.brand}</div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          보증 종료 {formatDate(end)}
                        </div>
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-full px-3 py-1.5 text-sm font-bold " + toneClass(badge.tone)
                        }
                      >
                        {badge.text}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {missing > 0 && (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                보증 종료일이 등록되지 않은 물건 {missing}개는 목록에서 빠져있어요.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}