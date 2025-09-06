"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/* ---------------- Theme ---------------- */
const NAVY = "#0a1931";
const YELLOW = "#ffd60a";

/* ---------------- Types from API ---------------- */
type Weights = { time: number; cost: number; comfort: number };
type Prefs = {
  weights: Weights;
  language: "en" | "si" | "ta";
  walk_limit_m: number;
  voice_assist: boolean;
};
type SuggestionRow = {
  id: string;
  kind: string;
  title: { en?: string; si?: string; ta?: string };
  body: { en?: string; si?: string; ta?: string };
  payload?: { weights?: Record<string, string | number> };
};
type TransportData = { buses: any[]; trains: any[] };

/* ---------------- Helpers ---------------- */
function t(
  textObj: { en?: string; si?: string; ta?: string } | undefined,
  lang: Prefs["language"]
) {
  if (!textObj) return "";
  return textObj[lang] ?? textObj.en ?? "";
}

function speak(enabled: boolean, text: string) {
  if (typeof window === "undefined") return;
  if (!enabled) return;
  if ("speechSynthesis" in window) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}

/* ---------------- Small UI bits ---------------- */
function Card({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`reveal rounded-3xl p-4 md:p-5 bg-white/5 border border-white/10 ${className}`}
      style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}
    >
      {children}
    </div>
  );
}
function Chip({ children }: React.PropsWithChildren) {
  return (
    <div className="rounded-lg px-3 py-2 border border-white/10 bg-white/5">
      {children}
    </div>
  );
}
function PrefSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="uppercase tracking-wide">{label}</span>
        <span>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.currentTarget.value, 10))}
        className="w-full accent-yellow-400"
      />
    </div>
  );
}

/* ---------------- Toast ---------------- */
function Toast({
  msg,
  visible,
  onClose,
}: {
  msg: string;
  visible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div
        className="rounded-xl px-4 py-3 text-sm font-medium"
        style={{
          background: "rgba(255,214,10,0.95)",
          color: "#111",
          border: `1px solid ${YELLOW}`,
          boxShadow: "0 10px 20px rgba(0,0,0,0.35)",
        }}
      >
        {msg}
      </div>
    </div>
  );
}

/* ---------------- Scenario buttons ---------------- */
function ScenarioButton({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
        active ? "bg-yellow-400 text-black" : "bg-white/5 text-white/85"
      }`}
      style={{
        borderColor: active ? `${YELLOW}cc` : "rgba(255,255,255,0.18)",
      }}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}

/* ====================================================================== */
/*                             MAIN COMPONENT                              */
/* ====================================================================== */
export default function PersonalizeDashboard() {
  const root = useRef<HTMLDivElement | null>(null);

  /* ---------- state ---------- */
  const [prefs, setPrefs] = useState<Prefs>({
    weights: { time: 60, cost: 50, comfort: 50 },
    language: "en",
    walk_limit_m: 900,
    voice_assist: true,
  });
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [transportData, setTransportData] = useState<TransportData>({
    buses: [],
    trains: [],
  });
  const [loading, setLoading] = useState(true);

  // scenarios
  const [peak, setPeak] = useState(false);
  const [rain, setRain] = useState(false);
  const [trainDelay, setTrainDelay] = useState(false);

  // toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  /* ---------- GSAP animations ---------- */
  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".reveal", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.06,
      });
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count || 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => (el.innerText = String(Math.round(obj.v))),
        });
      });
      gsap.to(".bus-vid", {
        scale: 1.05,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, root);
    return () => ctx.revert();
  }, []);

  /* ---------- Load preferences & suggestions ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/preferences", { cache: "no-store" }),
          fetch("/api/suggestions", { cache: "no-store" }),
        ]);
        const p = await pRes.json().catch(() => null);
        if (p && p.weights) setPrefs(p);

        const s = await sRes.json().catch(() => []);
        setSuggestions(Array.isArray(s) ? s : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Live transport updates ---------- */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/transport");
        const data: TransportData = await res.json();
        setTransportData(data);
        // Example dynamic re-score
        recalcSuggestions(data);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, peak, rain, trainDelay]);

  /* ---------- Save preferences (debounced) ---------- */
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      }).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [prefs, loading]);

  /* ---------- Scenario effects on local view ---------- */
  useEffect(() => {
    // lightweight local effects (not persisted):
    setPrefs((prev) => {
      const next = { ...prev };
      const w = { ...next.weights };

      // start from base
      // (avoid compounding by reading from prev directly & clamping)
      if (peak) w.time = Math.min(100, Math.max(w.time, 70));
      if (rain) next.walk_limit_m = 600;
      else next.walk_limit_m = Math.max(next.walk_limit_m, 800);

      if (trainDelay) {
        // nudge away from trains
        // @ts-ignore
        w.time = Math.min(100, (w.time as number) + 0); // leave time
      }
      next.weights = w;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peak, rain, trainDelay]);

  /* ---------- Apply suggestion ---------- */
  async function applySuggestion(row: SuggestionRow) {
    // optimistic local update
    if (row.payload?.weights) {
      setPrefs((old) => {
        const next = { ...old, weights: { ...old.weights } };
        for (const [k, raw] of Object.entries(row.payload!.weights!)) {
          const delta =
            typeof raw === "string"
              ? parseInt(raw.replace("+", ""), 10)
              : Number(raw);
          if (k in next.weights) {
            // @ts-ignore
            next.weights[k] = Math.max(
              0,
              Math.min(
                100,
                (next.weights[k] as number) + (isFinite(delta) ? delta : 0)
              )
            );
          }
        }
        return next;
      });
    }

    setApplied((m) => ({ ...m, [row.id]: true }));

    const msg = `✓ ${t(row.title, prefs.language)} — applied`;
    setToastMsg(msg);
    setToastOpen(true);
    speak(prefs.voice_assist, msg);

    // tell server to apply (persists to DB)
    try {
      await fetch(`/api/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: row.id, applyPayload: true }),
      });
    } catch {}
  }

  /* ---------- Helpers ---------- */
  function recalcSuggestions(_data: TransportData) {
    // Example: weight-based scoring
    const updated = suggestions.map((s) => {
      let score = 0;
      if (s.payload?.weights) {
        for (const [k, val] of Object.entries(s.payload.weights)) {
          const weight = (prefs.weights as any)[k] || 0;
          const numVal =
            typeof val === "string"
              ? parseInt(val.replace("+", ""), 10)
              : Number(val);
          score += weight * (isFinite(numVal) ? numVal : 0);
        }
      }
      // scenario nudges
      if (rain && s.kind === "comfort") score += 10;
      if (peak && s.kind === "time") score += 10;
      if (trainDelay && s.kind === "rail") score -= 10;
      return { ...s, score };
    });
    setSuggestions(updated.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)));
  }

  /* ---------------- Render ---------------- */
  return (
    <div
      ref={root}
      className="min-h-screen"
      style={{ background: NAVY, color: "white" }}
    >
      <LeftRail />
      <LeftVideoBackground />

      <main className="pl-[88px] pr-6 md:pr-10 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="reveal text-2xl md:text-3xl font-semibold">
            Personalization
          </h1>

          {/* Language + Voice + Scenarios */}
          <div className="reveal flex flex-wrap items-center gap-2">
            <select
                className="rounded-md bg-white/10 border border-white/20 px-2 py-1 text-white"
    value={prefs.language}
              onChange={(e) =>
                  setPrefs((p) => ({ ...p, language: e.target.value as Prefs["language"] }))
              }
              title="Language"
            >
              <option value="en">English</option>
              <option value="si">සිංහල</option>
              <option value="ta">தமிழ்</option>
            </select>

            <button
              className={`text-xs px-3 py-2 rounded-lg border ${
                prefs.voice_assist
                  ? "bg-yellow-400 text-black"
                  : "bg-white/5 text-white/85"
              }`}
              style={{
                borderColor: prefs.voice_assist
                  ? `${YELLOW}cc`
                  : "rgba(255,255,255,0.18)",
              }}
              onClick={() =>
                setPrefs((p) => ({ ...p, voice_assist: !p.voice_assist }))
              }
              title="Voice Assist"
            >
              {prefs.voice_assist ? "🔊 Voice: On" : "🔇 Voice: Off"}
            </button>

            <ScenarioButton
              active={peak}
              label="Peak"
              icon="⏰"
              onClick={() => setPeak((v) => !v)}
            />
            <ScenarioButton
              active={rain}
              label="Rain"
              icon="🌧️"
              onClick={() => setRain((v) => !v)}
            />
            <ScenarioButton
              active={trainDelay}
              label="Delay"
              icon="⚠️"
              onClick={() => setTrainDelay((v) => !v)}
            />
          </div>
        </div>

        <div className="reveal mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <section className="xl:col-span-1 grid gap-4">
            <Card>
              <div className="text-sm font-semibold mb-3">Your Preferences</div>
              <PrefSlider
                label="Time"
                value={prefs.weights.time}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, weights: { ...p.weights, time: v } }))
                }
              />
              <PrefSlider
                label="Cost"
                value={prefs.weights.cost}
                onChange={(v) =>
                  setPrefs((p) => ({ ...p, weights: { ...p.weights, cost: v } }))
                }
              />
              <PrefSlider
                label="Comfort"
                value={prefs.weights.comfort}
                onChange={(v) =>
                  setPrefs((p) => ({
                    ...p,
                    weights: { ...p.weights, comfort: v },
                  }))
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Chip>Language: {prefs.language}</Chip>
                <Chip>Voice: {prefs.voice_assist ? "On" : "Off"}</Chip>
                <Chip>Walk Limit: {prefs.walk_limit_m} m</Chip>
                <Chip>Peak: {peak ? "Yes" : "No"}</Chip>
              </div>
            </Card>
          </section>

          {/* Center Column */}
          <section className="xl:col-span-1">
            <Card className="flex flex-col gap-4">
              <VehicleCard />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Stat label="Travel Time" unit="mins" count={44} />
                <Stat label="Transfers" unit="modes" count={2} />
                <Stat label="Walk Distance" unit="m" count={rain ? 600 : 800} />
                <Stat label="Fare Estimate" unit="LKR" count={120} />
              </div>
            </Card>
          </section>

          {/* Right Column */}
          <section className="xl:col-span-1 grid gap-4">
            <SuggestionsCard
              lang={prefs.language}
              suggestions={suggestions}
              applied={applied}
              applySuggestion={applySuggestion}
              loading={loading}
            />
            <MapCard />
          </section>
        </div>
      </main>

      <Toast
        msg={toastMsg}
        visible={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */
function LeftRail() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[72px] bg-black/25 backdrop-blur-sm rounded-r-3xl border-r border-white/10 flex flex-col items-center py-6 gap-4">
      <div
        className="h-10 w-10 rounded-2xl grid place-items-center"
        style={{
          background: "rgba(255,214,10,0.15)",
          border: "1px solid rgba(255,214,10,0.35)",
          color: YELLOW,
        }}
      >
        <span className="font-bold">AI</span>
      </div>
      <div className="flex flex-col gap-3 text-white/70 text-sm">
        <span>●</span>
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </div>
      <div className="mt-auto text-[10px] text-white/40">v1.1</div>
    </aside>
  );
}

function LeftVideoBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden">
        <video
          className="bus-vid absolute inset-0 h-full w-full object-cover"
          src="/media/bs.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            WebkitClipPath: "circle(60vh at 0 50%)",
            clipPath: "circle(60vh at 0 50%)",
            filter: "contrast(1.05) brightness(0.9)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 20% 50%, rgba(255,214,10,0.25), rgba(10,25,49,0.7) 60%, rgba(10,25,49,0.95))",
          }}
        />
      </div>
    </div>
  );
}

function VehicleCard() {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
      <div className="flex-1 min-h-[180px] grid place-items-center rounded-2xl bg-white/5 border border-white/10">
        <div className="h-28 w-48 rounded-xl bg-gradient-to-br from-white/40 to-white/10" />
      </div>
      <div className="w-full md:w-auto grid gap-2">
        <div className="inline-flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-lg font-mono bg-black text-white border border-white/20">
            XYZ-123
          </span>
          <a
            className="text-[12px] text-white/70 underline underline-offset-4 hover:text-white"
            href="#"
          >
            View Documents
          </a>
        </div>
      </div>
    </div>
  );
}

function SuggestionsCard({
  suggestions,
  applied,
  loading,
  applySuggestion,
  lang,
}: {
  suggestions: SuggestionRow[];
  applied: Record<string, boolean>;
  loading: boolean;
  applySuggestion: (row: SuggestionRow) => void;
  lang: Prefs["language"];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">AI Suggestions</div>
        <span
          className="text-[11px] rounded-full px-2 py-0.5"
          style={{
            background: "rgba(255,214,10,0.15)",
            color: YELLOW,
            border: `1px solid ${YELLOW}55`,
          }}
        >
          Live
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {suggestions.length === 0 && (
          <div className="text-xs text-white/60 rounded-xl border border-white/10 p-4">
            {loading ? "Loading…" : "No suggestions yet."}
          </div>
        )}

        {suggestions.map((s) => {
          const isApplied = !!applied[s.id];
          return (
            <div
              key={s.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4"
            >
              <div
                className="h-8 w-8 rounded-lg grid place-items-center text-black"
                style={{ background: YELLOW }}
              >
                {s.kind.includes("rail")
                  ? "🚆"
                  : s.kind.includes("cost")
                  ? "🚌"
                  : "🛺"}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{t(s.title, lang)}</div>
                <div className="text-xs text-white/70 mt-0.5">
                  {t(s.body, lang)}
                </div>
              </div>
              {isApplied ? (
                <div className="text-[11px] px-2 py-1 rounded-lg bg-white/10 border border-white/20">
                  Applied ✓
                </div>
              ) : (
                <button
                  onClick={() => applySuggestion(s)}
                  className="rounded-lg text-[11px] px-2.5 py-1.5 bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition"
                >
                  Apply
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function MapCard() {
  return (
    <Card className="overflow-hidden">
      <div className="rounded-2xl overflow-hidden border border-white/10">
        <div className="h-[300px] w-full bg-white/5 relative">
          <iframe
            title="map"
            className="absolute inset-0 h-full w-full"
            src="https://www.openstreetmap.org/export/embed.html?bbox=79.84,6.86,79.92,6.95&layer=mapnik&marker=6.92,79.88"
          />
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  unit,
  count,
}: {
  label: string;
  unit?: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl p-4 bg-black/40 border border-white/10">
      <div className="text-xs text-white/70">{label}</div>
      <div className="mt-1 text-2xl font-semibold flex items-baseline gap-1">
        <span data-count={count}>0</span>
        {unit && <span className="text-sm text-white/70">{unit}</span>}
      </div>
    </div>
  );
}
