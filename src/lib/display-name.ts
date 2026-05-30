import type { Item } from "@/lib/items-store";

const DOC_LABEL_RE = /^(영수증|보증서|보증\s*서|설명서|사용\s*설명서|매뉴얼|manual|receipt|warranty)\s*$/i;
const PRODUCT_KEYS = [
  "product_name", "productname", "product", "productName",
  "item_name", "itemname", "model_name", "modelname", "model",
  "제품명", "상품명", "품명", "품목명", "모델명", "모델",
];
const STORE_LIKE_KEYS = ["store_name", "storename", "store", "merchant", "vendor", "shop", "가게", "상호", "구매처"];

function normalizeKey(k: string) {
  return k.replace(/[\s_-]+/g, "").toLowerCase();
}

function findInAnalysis(data: unknown, keys: string[]): string | undefined {
  const wanted = new Set(keys.map(normalizeKey));
  const walk = (v: unknown): string | undefined => {
    if (!v || typeof v !== "object") return undefined;
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      if (wanted.has(normalizeKey(key))) {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (typeof val === "number") return String(val);
      }
      if (val && typeof val === "object") {
        const nested = walk(val);
        if (nested) return nested;
      }
    }
    return undefined;
  };
  return walk(data);
}

/** Resolve a user-friendly product name, avoiding doc labels and store names. */
export function displayProductName(item: Item): string {
  const analysisProduct = findInAnalysis(item.analysis, PRODUCT_KEYS);
  if (analysisProduct && !DOC_LABEL_RE.test(analysisProduct)) return analysisProduct;

  if (item.name && !DOC_LABEL_RE.test(item.name)) {
    // also reject names that match a store-like fallback used during proof parsing
    const storeName = findInAnalysis(item.analysis, STORE_LIKE_KEYS);
    if (!storeName || storeName !== item.name) return item.name;
  }

  if (item.model && item.model.trim()) return item.model.trim();
  if (item.brand && item.brand.trim()) return item.brand.trim();
  if (item.name && !DOC_LABEL_RE.test(item.name)) return item.name;
  return "내 물건";
}