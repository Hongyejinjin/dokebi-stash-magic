import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Dokkaebi } from "@/components/Dokkaebi";
import { SiteHeader } from "@/components/SiteHeader";
import { addItem, FEATURES, type FeatureKey, updateItem } from "@/lib/items-store";

const searchSchema = z.object({
  feature: z.enum(["proof", "manual", "warranty", "lost"]).optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "물건 등록 — 물건 도깨비" }] }),
  component: RegisterPage,
});

type Step = "feature" | "upload" | "analyzing" | "review" | "transforming" | "done";

function RegisterPage() {
  const navigate = useNavigate();
  const { feature: initial } = Route.useSearch();
  const [step, setStep] = useState<Step>(initial ? "upload" : "feature");
  const [feature, setFeature] = useState<FeatureKey | null>(initial ?? null);
  const [photo, setPhoto] = useState<string | undefined>();
  const [form, setForm] = useState({
    name: "", brand: "", model: "", serial: "",
    purchaseDate: "", purchasePlace: "", price: "",
    warrantyUntil: "", asInfo: "", usage: "", cautions: "", careCycle: "",
  });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [characterUrl, setCharacterUrl] = useState<string | undefined>();

  const choose = (k: FeatureKey) => { setFeature(k); setStep("upload"); };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runAnalyze = async () => {
    setStep("analyzing");
    // Simulated AI extraction (placeholder values to demo the UX)
    await new Promise((r) => setTimeout(r, 2200));
    setForm((f) => ({
      ...f,
      name: f.name || "내 새 물건",
      brand: f.brand || "Apple",
      model: f.model || "Model X",
      purchaseDate: f.purchaseDate || new Date().toISOString().slice(0, 10),
      warrantyUntil: f.warrantyUntil || new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10),
      usage: f.usage || "전원 버튼을 길게 눌러 켜고, 사용 후엔 부드러운 천으로 닦아주세요.",
      cautions: f.cautions || "물기·고온·강한 충격을 피해주세요.",
      careCycle: f.careCycle || "월 1회 점검",
    }));
    setStep("review");
  };

  const saveAndTransform = async () => {
    if (!feature) return;
    const item = addItem({ feature, photo, ...form });
    setCreatedId(item.id);
    setStep("transforming");
    // Call n8n character API
    try {
      const res = await fetch("https://hjinjin.app.n8n.cloud/webhook-test/my-hackathon1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, brand: item.brand, photo }),
      });
      if (res.ok) {
        const text = await res.text();
        let url: string | undefined;
        try {
          const data = JSON.parse(text);
          url = data.imageUrl || data.url || data.image || data.character || data.output;
        } catch {
          if (text.startsWith("http")) url = text.trim();
        }
        if (url) {
          setCharacterUrl(url);
          updateItem(item.id, { characterUrl: url });
        }
      }
    } catch {
      // network failed — character is optional; continue
    }
    await new Promise((r) => setTimeout(r, 1400));
    setStep("done");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-20">
        <div className="mt-6">
          <Progress step={step} />
        </div>

        {step === "feature" && (
          <section className="mt-6 animate-float-up">
            <h1 className="text-2xl font-bold">어떤 관리가 필요한가요?</h1>
            <p className="mt-1 text-sm text-muted-foreground">하나를 골라야 도깨비가 알맞게 정리해드려요.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(Object.keys(FEATURES) as FeatureKey[]).map((k) => (
                <button key={k} onClick={() => choose(k)} className="rounded-3xl border border-border bg-card p-5 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-glow">
                  <div className="text-3xl">{FEATURES[k].emoji}</div>
                  <div className="mt-3 font-bold">{FEATURES[k].label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{FEATURES[k].desc}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "upload" && feature && (
          <section className="mt-6 animate-float-up">
            <h1 className="text-2xl font-bold">물건 자료를 올려주세요</h1>
            <p className="mt-1 text-sm text-muted-foreground">사진·영수증·보증서·설명서 모두 좋아요.</p>
            <label className="mt-5 block cursor-pointer rounded-3xl border-2 border-dashed border-border bg-mint/30 p-10 text-center transition hover:bg-mint/50">
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              {photo ? (
                <img src={photo} alt="업로드" className="mx-auto max-h-56 rounded-2xl object-contain" />
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <div className="text-sm font-semibold">탭하여 사진 추가 또는 드래그</div>
                  <div className="text-xs text-muted-foreground">PNG · JPG · PDF</div>
                </div>
              )}
            </label>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-muted-foreground">물건 이름 (선택)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 맥북 프로 14"
                className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={runAnalyze} className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.01]">
              도깨비에게 맡기기 ✨
            </button>
          </section>
        )}

        {step === "analyzing" && (
          <LoadingScene message="도깨비가 물건 정보를 정리하고 있어요!" />
        )}

        {step === "review" && (
          <section className="mt-6 animate-float-up">
            <h1 className="text-2xl font-bold">AI가 정리한 정보예요</h1>
            <p className="mt-1 text-sm text-muted-foreground">필요한 부분만 살짝 고쳐주세요.</p>
            <div className="mt-5 space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <Field label="물건 이름"   value={form.name}          onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="브랜드"      value={form.brand ?? ""}   onChange={(v) => setForm({ ...form, brand: v })} />
              <Field label="모델명"      value={form.model ?? ""}   onChange={(v) => setForm({ ...form, model: v })} />
              <Field label="시리얼 번호" value={form.serial ?? ""}  onChange={(v) => setForm({ ...form, serial: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="구매일"   value={form.purchaseDate ?? ""}  onChange={(v) => setForm({ ...form, purchaseDate: v })} type="date" />
                <Field label="보증 만료" value={form.warrantyUntil ?? ""} onChange={(v) => setForm({ ...form, warrantyUntil: v })} type="date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="구매처" value={form.purchasePlace ?? ""} onChange={(v) => setForm({ ...form, purchasePlace: v })} />
                <Field label="가격"   value={form.price ?? ""}         onChange={(v) => setForm({ ...form, price: v })} />
              </div>
              <Field label="사용 방법" value={form.usage ?? ""}    onChange={(v) => setForm({ ...form, usage: v })} multiline />
              <Field label="주의사항" value={form.cautions ?? ""} onChange={(v) => setForm({ ...form, cautions: v })} multiline />
              <Field label="관리 주기" value={form.careCycle ?? ""} onChange={(v) => setForm({ ...form, careCycle: v })} />
            </div>
            <button onClick={saveAndTransform} className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-soft transition hover:scale-[1.01]">
              저장하고 캐릭터로 변신 🪄
            </button>
          </section>
        )}

        {step === "transforming" && (
          <LoadingScene message="도깨비 마법으로 캐릭터로 변환 중...✨" swinging />
        )}

        {step === "done" && createdId && (
          <section className="mt-10 animate-float-up text-center">
            <Dokkaebi size={150} />
            <h1 className="mt-4 text-2xl font-bold">정리 완료!</h1>
            <p className="mt-1 text-sm text-muted-foreground">새 친구가 나의 도깨비 보관함에 도착했어요.</p>
            {characterUrl && (
              <img src={characterUrl} alt="캐릭터" className="mx-auto mt-5 size-48 rounded-3xl object-cover shadow-glow" />
            )}
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => navigate({ to: "/items/$id", params: { id: createdId } })} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">
                상세 보기
              </button>
              <button onClick={() => navigate({ to: "/my" })} className="rounded-full bg-mint px-5 py-2.5 text-sm font-semibold text-foreground">
                보관함으로
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; type?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground">{props.label}</label>
      {props.multiline ? (
        <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)} rows={2}
          className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      ) : (
        <input type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      )}
    </div>
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

function Progress({ step }: { step: Step }) {
  const order: Step[] = ["feature", "upload", "analyzing", "review", "transforming", "done"];
  const idx = order.indexOf(step);
  const pct = ((idx + 1) / order.length) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}