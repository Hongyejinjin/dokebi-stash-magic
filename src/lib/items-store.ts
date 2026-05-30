import { useEffect, useState } from "react";

export type FeatureKey = "proof" | "manual" | "warranty" | "lost";

export const FEATURES: Record<FeatureKey, { label: string; emoji: string; desc: string }> = {
  proof:    { label: "증빙 관리",    emoji: "🏆", desc: "영수증·구매 증빙 보관" },
  manual:   { label: "사용법 관리",  emoji: "📖", desc: "설명서 요약·사용 가이드" },
  warranty: { label: "보증 기한 알림", emoji: "⏰", desc: "보증·교환 기간 D-Day" },
  lost:     { label: "분실 방지",    emoji: "🪄", desc: "소중한 물건 알림" },
};

export type Item = {
  id: string;
  feature: FeatureKey;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
  purchaseDate?: string;
  purchasePlace?: string;
  price?: string;
  warrantyUntil?: string;
  asInfo?: string;
  usage?: string;
  cautions?: string;
  careCycle?: string;
  photo?: string; // base64
  characterUrl?: string;
  createdAt: number;
};

const KEY = "dokkaebi-items-v1";

function read(): Item[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: Item[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("dokkaebi:items"));
}

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("dokkaebi:items", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("dokkaebi:items", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return items;
}

export function addItem(item: Omit<Item, "id" | "createdAt">): Item {
  const full: Item = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  write([full, ...read()]);
  return full;
}

export function updateItem(id: string, patch: Partial<Item>) {
  write(read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function getItem(id: string): Item | undefined {
  return read().find((i) => i.id === id);
}

export function removeItem(id: string) {
  write(read().filter((i) => i.id !== id));
}