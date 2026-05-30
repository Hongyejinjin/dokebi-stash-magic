import { useEffect, useState } from "react";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export type FeatureKey = "auto" | "proof" | "manual" | "warranty" | "lost";

export const FEATURES: Record<FeatureKey, { label: string; emoji: string; desc: string }> = {
  auto:     { label: "통합 등록",    emoji: "✨", desc: "사진 한 장으로 모두 정리" },
  proof:    { label: "증빙 관리",    emoji: "🏆", desc: "영수증·구매 증빙 보관" },
  manual:   { label: "사용법 관리",  emoji: "📖", desc: "설명서 요약·사용 가이드" },
  warranty: { label: "보증 기한 알림", emoji: "⏰", desc: "보증·교환 기간 D-Day" },
  lost:     { label: "분실 방지",    emoji: "🪄", desc: "소중한 물건 알림" },
};

export type DocKind = "receipt" | "manual" | "warranty" | "repair" | "item";

export type RepairLog = { date: string; note: string; parts?: string };

export type Item = {
  id: string;
  feature: FeatureKey;
  docKind?: DocKind;
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
  summary?: string;
  careCycle?: string;
  repairs?: RepairLog[];
  speech?: string;
  analysis?: Record<string, unknown>;
  createdAt: number;
};

const KEY = "dokkaebi-items-v2";
const IMG_KEY = (id: string) => `dokkaebi-img:${id}`;

export type ItemImages = { photo?: string; characterUrl?: string };

function read(): Item[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return raw as Item[];
  } catch { return []; }
}
function write(items: Item[]) {
  // Defensive: strip any large base64 fields that may leak in.
  const safe = items.map(({ photo: _p, characterUrl: _c, ...rest }: any) => rest);
  localStorage.setItem(KEY, JSON.stringify(safe));
  window.dispatchEvent(new Event("dokkaebi:items"));
}

// One-time migration from v1: drop base64 from old store.
if (typeof window !== "undefined") {
  try {
    const old = localStorage.getItem("dokkaebi-items-v1");
    if (old && !localStorage.getItem(KEY)) {
      const parsed = JSON.parse(old) as Item[];
      const stripped = parsed.map(({ photo: _p, characterUrl: _c, ...rest }: any) => rest);
      localStorage.setItem(KEY, JSON.stringify(stripped));
    }
    localStorage.removeItem("dokkaebi-items-v1");
  } catch {
    try { localStorage.removeItem("dokkaebi-items-v1"); } catch {}
  }
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

export async function addItem(
  item: Omit<Item, "id" | "createdAt"> & ItemImages,
): Promise<Item> {
  const { photo, characterUrl, ...rest } = item;
  const id = crypto.randomUUID();
  const full: Item = { ...rest, id, createdAt: Date.now() };
  if (photo || characterUrl) {
    await idbSet(IMG_KEY(id), { photo, characterUrl } satisfies ItemImages);
  }
  write([full, ...read()]);
  return full;
}

export async function updateItem(id: string, patch: Partial<Item> & ItemImages) {
  const { photo, characterUrl, ...rest } = patch;
  if (photo !== undefined || characterUrl !== undefined) {
    const prev = ((await idbGet(IMG_KEY(id))) as ItemImages | undefined) ?? {};
    await idbSet(IMG_KEY(id), {
      photo: photo ?? prev.photo,
      characterUrl: characterUrl ?? prev.characterUrl,
    });
    window.dispatchEvent(new CustomEvent("dokkaebi:img", { detail: id }));
  }
  if (Object.keys(rest).length) {
    write(read().map((i) => (i.id === id ? { ...i, ...rest } : i)));
  }
}

export function getItem(id: string): Item | undefined {
  return read().find((i) => i.id === id);
}

export async function removeItem(id: string) {
  write(read().filter((i) => i.id !== id));
  try { await idbDel(IMG_KEY(id)); } catch {}
}

export async function getItemImages(id: string): Promise<ItemImages> {
  try {
    return ((await idbGet(IMG_KEY(id))) as ItemImages | undefined) ?? {};
  } catch {
    return {};
  }
}

export function useItemImages(id?: string): ItemImages {
  const [imgs, setImgs] = useState<ItemImages>({});
  useEffect(() => {
    if (!id) { setImgs({}); return; }
    let cancel = false;
    getItemImages(id).then((v) => { if (!cancel) setImgs(v); });
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === id) getItemImages(id).then((v) => { if (!cancel) setImgs(v); });
    };
    window.addEventListener("dokkaebi:img", h as EventListener);
    return () => { cancel = true; window.removeEventListener("dokkaebi:img", h as EventListener); };
  }, [id]);
  return imgs;
}