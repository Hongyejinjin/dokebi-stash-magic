import { Link } from "@tanstack/react-router";
import { Dokkaebi } from "./Dokkaebi";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="transition-transform group-hover:scale-110">
            <Dokkaebi size={36} />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">물건 도깨비</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
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