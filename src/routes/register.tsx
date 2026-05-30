import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { addItem, FEATURES, type FeatureKey } from "@/lib/items-store";

const searchSchema = z.object({
  feature: z.enum(["auto", "proof", "manual", "warranty"]).optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "물건 등록 — 물건 도깨비" }] }),
  component: RegisterPage,
});

const API = {
  proof: "https://hjinjin.app.n8n.cloud/webhook-test/my-hackerthon2",
  manualImage: "https://hjinjin.app.n8n.cloud/webhook-test/my-hackerthon2",
  manualQr: "https://hjinjin.app.n8n.cloud/webhook-test/22ab0fdf-3412-4fb6-9484-f63367e25694",
  warranty: "https://hjinjin.app.n8n.cloud/webhook-test/92a743f7-5148-48a3-9d87-acc4dba4db9c",
};

function RegisterPage() {
  const { feature: initial } = Route.useSearch();
  const [feature, setFeature] = useState<FeatureKey | null>(initial ?? null);

  if (!feature) {
    return (
      <Shell>
        <section className="mt-6 animate-float-up">
          <h1 className="text-2xl font-bold">어떤 관리가 필요한가요?</h1>
          <p className="mt-1 text-sm text-muted-foreground">하나를 골라야 도깨비가 알맞게 정리해드려요.</p>
          <Link
            to="/quick"
            className="mt-5 block rounded-3xl border border-primary/40 bg-gradient-hero p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-primary">✨ NEW</div>
                <div className="mt-1 text-lg font-bold">통합 등록 (AI 자동 인식)</div>
                <div className="mt-1 text-xs text-muted-foreground">사진 한 장이면 도깨비가 알아서 분류해요</div>
              </div>
              <div className="text-3xl">🪄</div>
            </div>
          </Link>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["proof","manual","warranty"] as FeatureKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setFeature(k)}
                className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="text-3xl">{FEATURES[k].emoji}</div>
                <div className="mt-3 font-bold">{FEATURES[k].label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{FEATURES[k].desc}</div>
              </button>
            ))}
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      {feature === "proof" && <ProofFlow onBack={() => setFeature(null)} />}
      {feature === "manual" && <ManualFlow onBack={() => setFeature(null)} />}
      {feature === "warranty" && <WarrantyFlow onBack={() => setFeature(null)} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20">{children}</main>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function callApi(url: string, payload: unknown): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      // unwrap common n8n shapes
      if (Array.isArray(j) && j[0]) return j[0] as Record<string, unknown>;
      return j as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  } catch {
    return {};
  }
}

async function postImage(url: string, file: File): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append("photo", file, file.name);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (Array.isArray(j) && j[0]) return j[0] as Record<string, unknown>;
    if (j && typeof j === "object") return j as Record<string, unknown>;
    return { summary: String(j) };
  } catch {
    return { raw: text };
  }
}

function pick(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

/* ----------------------------- UI atoms ----------------------------- */

function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mt-6">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-primary transition-all duration-500"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
        {steps.map((s, i) => (
          <span key={s} className={i <= current ? "text-primary" : ""}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function UploadBox({
  photo,
  onFile,
  label,
  hint,
  icon = "📷",
  accept = "image/*,.pdf",
}: {
  photo?: string;
  onFile: (f: File) => void;
  label: string;
  hint?: string;
  icon?: string;
  accept?: string;
}) {
  return (
    <label className="mt-5 block cursor-pointer rounded-3xl border-2 border-dashed border-border bg-mint/30 p-10 text-center transition hover:bg-mint/50">
      <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {photo ? (
        <img src={photo} alt="업로드" className="mx-auto max-h-56 rounded-2xl object-contain" />
      ) : (
        <div className="space-y-2">
          <div className="text-4xl">{icon}</div>
          <div className="text-sm font-semibold">{label}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      )}
    </label>
  );
}

function GateMessage({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
      등록되지 않았어요!
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft transition enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function BackButton({ onClick, label = "이전 단계" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
    >
      ← {label}
    </button>
  );
}

function LoadingScene({ message, swinging }: { message: string; swinging?: boolean }) {
  return (
    <section className="mt-16 flex flex-col items-center text-center">
      <Dokkaebi size={160} swinging={swinging} />
      <p className="mt-6 text-base font-semibold text-foreground">{message}</p>
      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 animate-sparkle rounded-full bg-primary" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </section>
  );
}

function DoneScene({ message, itemId }: { message: string; itemId: string }) {
  const navigate = useNavigate();
  return (
    <section className="mt-10 animate-float-up text-center">
      <Dokkaebi size={150} />
      <h1 className="mt-4 text-2xl font-bold">{message}</h1>
      <p className="mt-1 text-sm text-muted-foreground">도깨비 보관함에서 언제든 확인할 수 있어요.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => navigate({ to: "/items/$id", params: { id: itemId } })}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          상세 보기
        </button>
        <button
          onClick={() => navigate({ to: "/my" })}
          className="rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-foreground"
        >
          보관함으로
        </button>
      </div>
    </section>
  );
}

function ResultRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

/* ----------------------------- 1. PROOF ----------------------------- */

type ProofResult = {
  place: string;
  date: string;
  price: string;
  name: string;
  brand: string;
  summary: string;
  extras: { label: string; value: string }[];
  raw: Record<string, unknown>;
};

const PROOF_PRIMARY_KEYS = new Set([
  "store_name", "place", "store", "purchasePlace", "구매처",
  "purchase_date", "date", "purchaseDate", "구매일",
  "total_price", "price", "amount", "구매금액",
  "product_name", "name", "product", "productName", "상품명",
  "brand", "브랜드",
  "summary", "요약",
]);

function humanizeKey(k: string): string {
  return k
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stringifyValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function collectExtras(data: Record<string, unknown>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (PROOF_PRIMARY_KEYS.has(k)) continue;
    const text = stringifyValue(v);
    if (!text.trim()) continue;
    out.push({ label: humanizeKey(k), value: text });
  }
  return out;
}

// Extract a purchase date string (YYYY-MM-DD / 2024년 5월 20일 / 20240520 / DD.MM.YYYY)
// from arbitrary text (summary, raw analysis stringified, etc.) so item.purchaseDate
// is never blindly defaulted to today when n8n only returns it inside the summary.
const DATE_RE = /(\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일?|\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\b\d{8}\b|\b\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}\b)/;
const LABELED_DATE_RE = /(?:구매\s*(?:날짜|일)|구입\s*(?:날짜|일)|결제\s*(?:날짜|일)|거래\s*(?:날짜|일시)|purchase\s*(?:date|day)|order\s*date|payment\s*date|transaction\s*date|date)\s*[:：\-–—]?\s*(\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일?|\d{4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}|\b\d{8}\b|\b\d{1,2}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{2,4}\b)/i;

function extractPurchaseDate(...sources: unknown[]): string | undefined {
  for (const src of sources) {
    if (!src) continue;
    const text = typeof src === "string" ? src : (() => { try { return JSON.stringify(src); } catch { return ""; } })();
    if (!text) continue;
    const labeled = text.match(LABELED_DATE_RE)?.[1];
    if (labeled) return labeled.trim();
    const any = text.match(DATE_RE)?.[1];
    if (any) return any.trim();
  }
  return undefined;
}

function ProofFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<ProofResult | null>(null);
  const [itemId, setItemId] = useState<string>("");

  const next = async () => {
    if (!photo || !photoFile) { setTried(true); return; }
    setStep(1);
    try {
      const data = await postImage(API.proof, photoFile);
      setResult({
        place: pick(data, "store_name", "place", "store", "purchasePlace", "구매처"),
        date:  pick(data, "purchase_date", "date", "purchaseDate", "구매일") || new Date().toISOString().slice(0, 10),
        price: pick(data, "total_price", "price", "amount", "구매금액"),
        name:  pick(data, "product_name", "name", "product", "productName", "상품명", "store_name") || "내 새 물건",
        brand: pick(data, "brand", "브랜드"),
        summary: pick(data, "summary", "요약"),
        extras: collectExtras(data),
        raw: data,
      });
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분석에 실패했어요");
      setStep(0);
    }
  };

  const finish = () => {
    if (!result) return;
    addItem({
      feature: "proof",
      photo,
      name: result.name,
      brand: result.brand,
      purchaseDate: result.date,
      purchasePlace: result.place,
      price: result.price,
      summary: result.summary || undefined,
      speech: result.summary || undefined,
      analysis: result.raw,
    }).then((item) => { setItemId(item.id); setStep(3); });
  };

  return (
    <>
      <Stepper steps={["증빙 등록", "분석", "정리", "완료"]} current={step} />
      {step === 0 && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={onBack} label="기능 다시 선택" />
          <h1 className="text-2xl font-bold">증빙 서류를 등록해주세요!</h1>
          <p className="mt-1 text-sm text-muted-foreground">영수증, 구매 내역서 등 어떤 증빙이든 좋아요.</p>
          <UploadBox
            photo={photo}
            onFile={async (f) => { setPhotoFile(f); setPhoto(await readFile(f)); setTried(false); }}
            label="탭하여 증빙 추가"
            hint="PNG · JPG · PDF"
            icon="🧾"
          />
          <GateMessage show={tried && !photo} />
          <PrimaryButton onClick={next}>다음 단계로</PrimaryButton>
        </section>
      )}
      {step === 1 && <LoadingScene message="도깨비가 증빙 서류를 분석하고 있어요!" />}
      {step === 2 && result && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={() => setStep(0)} />
          <h1 className="text-2xl font-bold">정리된 증빙 정보예요</h1>
          {result.summary && (
            <div className="mt-4 rounded-3xl border border-border bg-mint/20 p-5 shadow-soft">
              <div className="text-xs font-bold text-primary">도깨비가 정리한 전체 내용</div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {result.summary}
              </p>
            </div>
          )}
          <PrimaryButton onClick={finish}>저장하고 마무리</PrimaryButton>
        </section>
      )}
      {step === 3 && <DoneScene message="도깨비가 안전하게 증빙할게요! 👺" itemId={itemId} />}
    </>
  );
}

/* ----------------------------- 2. MANUAL ----------------------------- */

type ManualResult = { name: string; brand: string; summary: string; usage: string; cautions: string; care: string };

function ManualFlow({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<null | "image" | "qr">(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [qrText, setQrText] = useState("");
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<ManualResult | null>(null);
  const [itemId, setItemId] = useState<string>("");

  if (!mode) {
    return (
      <>
        <Stepper steps={["방식 선택", "등록", "분석", "완료"]} current={0} />
        <section className="mt-6 animate-float-up">
          <BackButton onClick={onBack} label="기능 다시 선택" />
          <h1 className="text-2xl font-bold">사용서를 등록하거나 QR코드를 인식해주세요!</h1>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => setMode("image")} className="rounded-3xl border border-border bg-card p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
              <div className="text-3xl">📖</div>
              <div className="mt-3 font-bold">사용서 이미지</div>
              <div className="mt-1 text-xs text-muted-foreground">설명서 사진을 올려요</div>
            </button>
            <button onClick={() => setMode("qr")} className="rounded-3xl border border-border bg-card p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
              <div className="text-3xl">🔳</div>
              <div className="mt-3 font-bold">QR 코드</div>
              <div className="mt-1 text-xs text-muted-foreground">QR 이미지 / 링크 인식</div>
            </button>
          </div>
        </section>
      </>
    );
  }

  const ready = mode === "image" ? !!photo : !!qrText.trim();

  const next = async () => {
    if (!ready) { setTried(true); return; }
    setStep(1);
    try {
      if (mode === "image") {
        if (!photoFile) throw new Error("이미지 파일이 없어요");
        const data = await postImage(API.manualImage, photoFile);
        setResult({
          name:     pick(data, "product_name", "name", "product", "productName", "제품명") || "내 새 물건",
          brand:    pick(data, "brand", "브랜드"),
          summary:  pick(data, "summary", "요약"),
          usage:    pick(data, "usage", "howTo", "사용법", "사용방법"),
          cautions: pick(data, "cautions", "warning", "주의사항"),
          care:     pick(data, "care", "maintenance", "관리방법"),
        });
      } else {
        const data = await callApi(API.manualQr, { type: "manual-qr", qr: qrText.trim() });
        setResult({
          name:     pick(data, "name", "product", "productName", "제품명") || "내 새 물건",
          brand:    pick(data, "brand", "브랜드"),
          summary:  pick(data, "summary", "요약"),
          usage:    pick(data, "usage", "howTo", "사용법", "사용방법"),
          cautions: pick(data, "cautions", "warning", "주의사항"),
          care:     pick(data, "care", "maintenance", "관리방법"),
        });
      }
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "분석에 실패했어요";
      toast.error("이미지 분석에 실패했어요", { description: message });
      setStep(0);
    }
  };

  const finish = () => {
    if (!result) return;
    addItem({
      feature: "manual",
      photo,
      name: result.name,
      brand: result.brand,
      usage: [result.summary, result.usage].filter(Boolean).join("\n\n"),
      cautions: result.cautions,
      careCycle: result.care,
    }).then((item) => { setItemId(item.id); setStep(3); });
  };

  return (
    <>
      <Stepper steps={["방식 선택", "등록", "분석", "완료"]} current={step + 1 > 3 ? 3 : step + 1} />
      {step === 0 && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={() => setMode(null)} label="방식 다시 선택" />
          <h1 className="mt-2 text-2xl font-bold">
            {mode === "image" ? "사용서 이미지를 등록해주세요" : "QR 코드를 등록해주세요"}
          </h1>
          {mode === "image" ? (
            <UploadBox
              photo={photo}
              onFile={async (f) => { setPhotoFile(f); setPhoto(await readFile(f)); setTried(false); }}
              label="탭하여 사용서 추가"
              hint="PNG · JPG · PDF"
              icon="📖"
            />
          ) : (
            <div className="mt-5 space-y-3">
              <UploadBox
                photo={photo}
                onFile={async (f) => { setPhotoFile(f); setPhoto(await readFile(f)); setQrText(f.name); setTried(false); }}
                label="QR 이미지 업로드"
                hint="또는 아래에 QR 링크 입력"
                icon="🔳"
                accept="image/*"
              />
              <input
                value={qrText}
                onChange={(e) => { setQrText(e.target.value); setTried(false); }}
                placeholder="QR 링크 / 코드 값"
                className="w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          <GateMessage show={tried && !ready} />
          <PrimaryButton onClick={next}>분석 시작</PrimaryButton>
        </section>
      )}
      {step === 1 && <LoadingScene message="이미지를 분석 중입니다..." swinging />}
      {step === 2 && result && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={() => setStep(0)} />
          <h1 className="text-2xl font-bold">사용법 정리 결과</h1>
          <ManualSections result={result} />
          <PrimaryButton onClick={finish}>저장하고 마무리</PrimaryButton>
        </section>
      )}
      {step === 3 && <DoneScene message="도깨비가 사용법을 정리했어요! 👺" itemId={itemId} />}
    </>
  );
}

/* ----------------------------- 3. WARRANTY ----------------------------- */

type WarrantyResult = { name: string; brand: string; period: string; start: string; end: string };

function WarrantyFlow({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tried, setTried] = useState(false);
  const [result, setResult] = useState<WarrantyResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [itemId, setItemId] = useState<string>("");

  const next = async () => {
    if (!photo || !photoFile) { setTried(true); return; }
    setStep(1);
    try {
      const data = await postImage(API.warranty, photoFile);
      const start = pick(data, "warranty_start", "start", "startDate", "보증시작일") || new Date().toISOString().slice(0, 10);
      const end   = pick(data, "warranty_end", "end", "endDate", "warrantyUntil", "보증종료일") ||
                    new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);
      setResult({
        name:   pick(data, "product_name", "name", "product", "productName", "제품명") || "내 새 물건",
        brand:  pick(data, "brand", "브랜드"),
        period: pick(data, "warranty_period", "period", "보증기간") || "1년",
        start,
        end,
      });
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분석에 실패했어요");
      setStep(0);
    }
  };

  const confirm = () => {
    if (!result) return;
    addItem({
      feature: "warranty",
      photo,
      name: result.name,
      brand: result.brand,
      purchaseDate: result.start,
      warrantyUntil: result.end,
      asInfo: `보증기간 ${result.period}`,
    }).then((item) => { setItemId(item.id); setStep(3); });
  };

  return (
    <>
      <Stepper steps={["보증서 등록", "분석", "확인 / 수정", "완료"]} current={step} />
      {step === 0 && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={onBack} label="기능 다시 선택" />
          <h1 className="text-2xl font-bold">보증서를 등록해주세요!</h1>
          <p className="mt-1 text-sm text-muted-foreground">보증서를 사진으로 찍어 올려주세요.</p>
          <UploadBox
            photo={photo}
            onFile={async (f) => { setPhotoFile(f); setPhoto(await readFile(f)); setTried(false); }}
            label="탭하여 보증서 추가"
            hint="PNG · JPG · PDF"
            icon="📜"
          />
          <GateMessage show={tried && !photo} />
          <PrimaryButton onClick={next}>다음 단계로</PrimaryButton>
        </section>
      )}
      {step === 1 && <LoadingScene message="도깨비가 보증 정보를 추출하고 있어요!" />}
      {step === 2 && result && (
        <section className="mt-6 animate-float-up">
          <BackButton onClick={() => setStep(0)} />
          <h1 className="text-2xl font-bold">보증 정보를 확인해주세요</h1>
          <p className="mt-1 text-sm text-muted-foreground">필요한 부분은 수정할 수 있어요.</p>
          <div className="mt-5 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
            {editing ? (
              <>
                <EditField label="제품명"     value={result.name}   onChange={(v) => setResult({ ...result, name: v })} />
                <EditField label="브랜드"     value={result.brand}  onChange={(v) => setResult({ ...result, brand: v })} />
                <EditField label="보증기간"   value={result.period} onChange={(v) => setResult({ ...result, period: v })} />
                <EditField label="보증 시작일" value={result.start}  onChange={(v) => setResult({ ...result, start: v })} type="date" />
                <EditField label="보증 종료일" value={result.end}    onChange={(v) => setResult({ ...result, end: v })}   type="date" />
              </>
            ) : (
              <>
                <ResultRow label="제품명" value={result.name} />
                <ResultRow label="브랜드" value={result.brand} />
                <ResultRow label="보증기간" value={result.period} />
                <ResultRow label="보증 시작일" value={result.start} />
                <ResultRow label="보증 종료일" value={result.end} />
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setEditing((e) => !e)}
              className="rounded-full border border-border bg-card py-3 text-sm font-semibold transition hover:bg-mint/40"
            >
              {editing ? "수정 완료" : "수정"}
            </button>
            <button
              onClick={confirm}
              className="rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.01]"
            >
              확인
            </button>
          </div>
        </section>
      )}
      {step === 3 && <DoneScene message="도깨비가 안전하게 보증할게요! 👺" itemId={itemId} />}
    </>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

/* ------------------ ManualSections: split summary by category ------------------ */

const SECTION_EMOJI: Record<string, string> = {
  "제품명": "🏷️", "상품명": "🏷️", "이름": "🏷️",
  "브랜드": "™️", "제조사": "🏭",
  "요약": "📝", "개요": "📝", "설명": "📝",
  "사용 방법": "📖", "사용방법": "📖", "사용법": "📖", "사용 순서": "📖",
  "주의사항": "⚠️", "주의": "⚠️", "경고": "⚠️",
  "관리 방법": "🧼", "관리방법": "🧼", "관리": "🧼", "보관": "📦", "보관 방법": "📦",
  "세탁": "🧺", "세탁 방법": "🧺",
  "재질": "🧵", "성분": "🧪", "원산지": "🌏",
  "유의사항": "⚠️", "특징": "✨", "기능": "✨",
};

function sectionIcon(label: string) {
  return SECTION_EMOJI[label.trim()] ?? "•";
}

function parseSummarySections(text: string): { label: string; body: string }[] {
  if (!text || !text.trim()) return [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  // Matches lines like "**제목**: ...", "## 제목", "제목: ...", "- 제목: ..."
  const headRe = /^[\s\-*•\d\.\)#]*(?:\*\*)?\s*([가-힣A-Za-z][가-힣A-Za-z0-9 _/]{0,18})\s*(?:\*\*)?\s*[:：](.*)$/;
  const sections: { label: string; body: string }[] = [];
  let current: { label: string; body: string } | null = null;
  const flush = () => { if (current && (current.body.trim() || current.label)) sections.push({ label: current.label, body: current.body.trim() }); current = null; };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "");
    const m = line.match(headRe);
    if (m) {
      flush();
      current = { label: m[1].trim(), body: m[2].trim() };
    } else if (current) {
      current.body += (current.body ? "\n" : "") + line.replace(/^\s*[-*•]\s?/, "• ");
    } else if (line.trim()) {
      // Free text before any section header → put under "요약"
      current = { label: "요약", body: line };
    }
  }
  flush();
  return sections;
}

function SectionCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>{sectionIcon(label)}</span>
        <h3 className="text-sm font-bold">{label}</h3>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{body || "—"}</p>
    </div>
  );
}

function ManualSections({ result }: { result: ManualResult }) {
  const parsed = parseSummarySections(result.summary);
  // Start with structured fields when present
  const baseOrder: { label: string; body: string }[] = [];
  const push = (label: string, body: string) => { if (body && body.trim()) baseOrder.push({ label, body: body.trim() }); };
  push("제품명", result.name);
  push("브랜드", result.brand);
  push("사용 방법", result.usage);
  push("주의사항", result.cautions);
  push("관리 방법", result.care);

  // Merge parsed sections: if same label already exists, append non-duplicate content
  const seen = new Map<string, number>();
  baseOrder.forEach((s, i) => seen.set(s.label, i));
  for (const p of parsed) {
    const key = p.label;
    const idx = seen.get(key);
    if (idx == null) {
      baseOrder.push(p);
      seen.set(key, baseOrder.length - 1);
    } else if (!baseOrder[idx].body.includes(p.body)) {
      baseOrder[idx] = { label: key, body: baseOrder[idx].body + "\n" + p.body };
    }
  }

  if (baseOrder.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-soft">
        정리된 내용이 없어요.
      </div>
    );
  }

  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {baseOrder.map((s, i) => (
        <SectionCard key={`${s.label}-${i}`} label={s.label} body={s.body} />
      ))}
    </div>
  );
}

