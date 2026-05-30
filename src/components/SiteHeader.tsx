import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Dokkaebi } from "./Dokkaebi";

export function SiteHeader() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showBack = pathname !== "/";
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="이전 단계로"
              className="mr-1 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-mint/60 hover:text-foreground"
            >
              ← 이전
            </button>
          )}
          <Link to="/my" aria-label="아카이브로 이동" className="transition-transform hover:scale-110">
            <Dokkaebi size={36} />
          </Link>
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            물건 도깨비
          </Link>
        </div>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link to="/quick" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition" activeProps={{ className: "rounded-full px-3 py-1.5 text-foreground bg-muted" }}>
            ✨ 통합 등록
          </Link>
          <Link to="/register" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition" activeProps={{ className: "rounded-full px-3 py-1.5 text-foreground bg-muted" }}>
            등록
          </Link>
          <Link to="/my" className="rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition" activeProps={{ className: "rounded-full px-3 py-1.5 text-foreground bg-muted" }}>
            나의 도깨비
          </Link>
        </nav>
      </div>
    </header>
  );
}