"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";
import { useRouter } from "next/navigation";
import LocalKnowledgeWidget from "@/components/LocalKnowledgeWidget";

// Register GSAP plugins (browser only)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Flip);
}

/* =================== Types =================== */
type RideLeg = {
  mode: "ride";
  trip_id: string;
  route_id: string;
  route_type?: number | null;
  from_stop: string;
  to_stop: string;
  from_seq: number;
  from_stop_name?: string; // NEW
  to_stop_name?: string; // NEW
  to_seq: number;
  depart_time: string;
  arrive_time: string;
};
type WalkLeg = {
  mode: "walk";
  from_stop: string;
  to_stop: string;
  from_stop_name?: string; // NEW
  to_stop_name?: string; // NEW
  depart_time: string;
  arrive_time: string;
};
type PlanLeg = RideLeg | WalkLeg;

type PlanResult = {
  origin_stop?: string;
  dest_stop?: string;
  found: boolean;
  depart_at: string;
  origin_name?: string; // NEW
  dest_name?: string; // NEW
  arrive_at: string;
  duration_min: number;
  transfers: number;
  legs: PlanLeg[];
  max_walk_m: number;
  _used_walk_limit_m?: number;
};

/* =================== tiny classnames =================== */
function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* =================== Inline icons =================== */
function IconTrain({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2c-4.42 0-8 1.79-8 4v9c0 1.66 1.34 3 3 3l-2 2h2.5l2-2h5l2 2H19l-2-2c1.66 0 3-1.34 3-3V6c0-2.21-3.58-4-8-4Zm-4 3h8c1.1 0 2 .45 2 1v4H6V6c0-.55.9-1 2-1Zm-2 9h12v1c0 .55-.9 1-2 1H10c-1.1 0-2-.45-2-1v-1Zm1 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      />
    </svg>
  );
}
function IconBus({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2c-4.97 0-9 1.12-9 5v8.5c0 .83.67 1.5 1.5 1.5h.5V20a2 2 0 0 0 4 0v-1h6v1a2 2 0 0 0 4 0v-1h.5c.83 0 1.5-.67 1.5-1.5V7c0-3.88-4.03-5-9-5Zm-6 5h12c.55 0 1 .45 1 1v4H5V8c0-.55.45-1 1-1Zm-1 7h14v1H5v-1Zm2 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm10 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
      />
    </svg>
  );
}
function IconTuk({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M3 7c0-1.1.9-2 2-2h6l2 3h3a3 3 0 0 1 3 3v4c0 1.1-.9 2-2 2h-1a2.5 2.5 0 1 1-5 0H9a2.5 2.5 0 1 1-5 0H4c-.55 0-1-.45-1-1V7Zm2 1v4h5l-2-4H5Zm12 4c0-1.1-.9-2-2-2h-2l1 2h3Z"
      />
    </svg>
  );
}

/* =================== Map w/ video mask =================== */
function SriLankaMap({
  videoSrc = "/media/map.mp4",
  fallbackImageSrc = "/images/k3.png",
}: {
  videoSrc?: string;
  fallbackImageSrc?: string;
}) {
  return (
    <svg className="w-full h-full" viewBox="0 0 600 800" aria-hidden>
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4F959D" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#F5C45E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F5C45E" stopOpacity="0" />
        </radialGradient>

        <filter id="to-luma" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.2126 0.7152 0.0722 0 0
              0.2126 0.7152 0.0722 0 0
              0.2126 0.7152 0.0722 0 0
              0       0       0     1 0"
          />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0 1 1" />
          </feComponentTransfer>
        </filter>

        <mask
          id="lk-img-mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="600"
          height="800"
        >
          <image
            href={fallbackImageSrc}
            x="0"
            y="0"
            width="700"
            height="900"
            preserveAspectRatio="xMidYMid slice"
            filter="url(#to-luma)"
          />
        </mask>
      </defs>

      <circle cx="350" cy="320" r="240" fill="url(#glow)" />

      <g mask="url(#lk-img-mask)">
        <foreignObject x="0" y="0" width="600" height="800">
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          >
            <img
              src={fallbackImageSrc}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </video>
        </foreignObject>

        {Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={i}
            className="route-dot"
            cx={150 + i * 50}
            cy={400 + (i % 2) * 40}
            r="3"
            fill="#a5f3fc"
          />
        ))}
        <path
          id="main-arc"
          className="route-arc"
          d="M150 430 Q300 300 460 380"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2"
          strokeDasharray="6 10"
        />
        <path
          className="route-arc"
          d="M200 250 Q330 200 430 280"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2"
          strokeDasharray="6 10"
        />
        <path
          className="route-arc"
          d="M220 520 Q330 430 420 500"
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2"
          strokeDasharray="6 10"
        />

        <g id="tuk-car" filter="url(#soft)" transform="translate(-999,-999)">
          <circle r="7" fill="#06b6d4" />
          <circle r="11" fill="#06b6d4" opacity="0.18" />
        </g>
      </g>
    </svg>
  );
}

// ── helpers (put near your other little utils) ─────────────────────────
function toHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* =================== Magnetic Button =================== */
function Magnetic({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, {
        x: x * 0.2,
        y: y * 0.2,
        duration: 0.3,
        ease: "power3.out",
      });
    };
    const onLeave = () =>
      gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: "power3.out" });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
  return (
    <button ref={ref} className={className} {...rest}>
      {children}
    </button>
  );
}

/* =================== Home =================== */
export default function Home() {
  const root = useRef<HTMLDivElement | null>(null);
  const [eta, setEta] = useState(30);
  const [voiceActive, setVoiceActive] = useState(false);
  // ✅ instead of any
  const [plan, setPlan] = useState<PlanResult | null>(null);

  // NEW: planner state
  const [fromId, setFromId] = useState("S06");
  const [toId, setToId] = useState("S09");
  const nameOrId = (name?: string, id?: string) => name || id || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stop_id input states (quick demo defaults)
  const router = useRouter();
  // planning

  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const spotlight = document.querySelector(
        ".spotlight"
      ) as HTMLDivElement | null;
      const onMove = (e: MouseEvent) => {
        if (!spotlight) return;
        const x = e.clientX,
          y = e.clientY;
        gsap.to(spotlight, {
          x: x - window.innerWidth / 2,
          y: y - window.innerHeight / 2,
          duration: 0.3,
          ease: "power3.out",
        });
      };
      window.addEventListener("mousemove", onMove);

      gsap.from(".hero-badge, .hero-title, .hero-sub, .hero-cta", {
        y: 24,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
      });

      gsap.to(".float-chip", {
        y: -10,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: "sine.inOut",
        stagger: 0.15,
      });

      gsap.utils.toArray<SVGPathElement>(".route-arc").forEach((p, i) => {
        const length = p.getTotalLength();
        gsap.set(p, { strokeDashoffset: length });
        gsap.to(p, {
          strokeDashoffset: 0,
          duration: 2 + i * 0.4,
          ease: "power2.out",
          repeat: -1,
          repeatDelay: 1.2,
          yoyo: true,
        });
      });

      gsap.to(".route-dot", {
        scale: 1.6,
        transformOrigin: "center",
        repeat: -1,
        yoyo: true,
        duration: 1.6,
        ease: "sine.inOut",
        stagger: 0.08,
      });

      const mapCard = document.querySelector(".map-card");
      if (mapCard) {
        const scrollTl = gsap.timeline({ defaults: { ease: "none" } });
        scrollTl.to("#tuk-car", {
          motionPath: {
            path: "#main-arc",
            align: "#main-arc",
            autoRotate: false,
            start: 0,
            end: 1,
          },
        });
        ScrollTrigger.create({
          animation: scrollTl,
          trigger: mapCard,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        });
      }

      const toNumber = (el: HTMLElement, end: number, suffix = "") => {
        gsap.fromTo(
          { val: 0 },
          { val: 0 },
          {
            val: end,
            duration: 2,
            ease: "power3.out",
            onUpdate() {
              el.textContent = `${Math.round(
                (this as any).targets()[0].val
              )}${suffix}`;
            },
          }
        );
      };
      document.querySelectorAll("[data-stat]").forEach((n) => {
        const el = n as HTMLElement;
        const end = Number(el.dataset.stat || 0);
        ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => toNumber(el, end, el.dataset.suffix || ""),
        });
      });

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      gsap.utils
        .toArray<HTMLElement>([".hero-card", ".map-card"])
        .forEach((el) => {
          el.addEventListener("mousemove", (e) => {
            const r = el.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
            const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
            gsap.to(el, {
              rotateX: dy * -6,
              rotateY: dx * 6,
              translateZ: 10,
              transformPerspective: 600,
              duration: 0.4,
            });
          });
          el.addEventListener("mouseleave", () =>
            gsap.to(el, {
              rotateX: 0,
              rotateY: 0,
              translateZ: 0,
              duration: 0.6,
            })
          );
        });

      const planBtn = document.querySelector(".btn-plan");
      const agentCards = gsap.utils.toArray<HTMLElement>(".agent-card");
      planBtn?.addEventListener("click", () => {
        const tl = gsap.timeline();
        agentCards.forEach((card, i) => {
          tl.to(
            card,
            {
              boxShadow: "0 0 0 2px rgba(34,211,238,0.6)",
              backgroundColor: "rgba(34,211,238,0.08)",
              duration: 0.25,
              ease: "power1.out",
            },
            i * 0.12
          ).to(
            card,
            {
              boxShadow: "0 0 0 0 rgba(34,211,238,0)",
              backgroundColor: "rgba(255,255,255,0.04)",
              duration: 0.35,
            },
            "+=0.15"
          );
        });
      });

      const mic = document.querySelector(".btn-voice");
      let pulse: gsap.core.Tween | null = null;
      const startPulse = () => {
        if (pulse) pulse.kill();
        pulse = gsap.to(".mic-pulse", {
          scale: 1.06,
          boxShadow: "0 0 0 12px rgba(34,211,238,0)",
          repeat: -1,
          yoyo: false,
          duration: 0.6,
        });
      };
      const stopPulse = () => {
        if (pulse) {
          pulse.kill();
          pulse = null;
        }
      };
      mic?.addEventListener("click", () => {
        const active = mic.classList.toggle("is-listening");
        if (active) startPulse();
        else stopPulse();
      });

      const sortButtons = gsap.utils.toArray<HTMLButtonElement>(".sort-btn");
      const list = document.querySelector(".itin-list") as HTMLElement | null;
      sortButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!list) return;
          // @ts-expect-error Flip global
          const state = gsap.Flip.getState(".itin-item");
          const items = Array.from(
            list.querySelectorAll<HTMLElement>(".itin-item")
          );
          const by = btn.dataset.by as
            | "time"
            | "cost"
            | "transfers"
            | undefined;
          items.sort(
            (a, b) =>
              Number(a.dataset[by as any]) - Number(b.dataset[by as any])
          );
          items.forEach((i) => list.appendChild(i));
          // @ts-expect-error Flip global
          gsap.Flip.from(state, { duration: 0.6, ease: "power2.inOut" });
        });
      });

      return () => {
        window.removeEventListener("mousemove", onMove);
        ScrollTrigger.getAll().forEach((s) => s.kill());
      };
    }, root);
    return () => ctx.revert();
  }, []);

  async function planTrip(departAt: string) {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          origin: { stop_id: fromId },
          destination: { stop_id: toId },
          depart_at: departAt,
        }),
      });

      const text = await r.text();
      const data: PlanResult | { error?: string } = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { error: text };
        }
      })();

      if (!r.ok)
        throw new Error(("error" in data && data.error) || `HTTP ${r.status}`);
      if (!("found" in data) || !data.found)
        throw new Error(("error" in data && data.error) || "No path found");

      setPlan(data as PlanResult);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handlePlanClick() {
    // send the user to the dedicated results page
    router.push(
      `/directions?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(
        toId
      )}&depart_in=${eta}`
    );
  }

  function handleDepartNow() {
    planTrip(toHHMM(new Date()));
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;
    if (!voiceActive) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }

  return (
    <div
      ref={root}
      className="min-h-screen bg-black text-white antialiased selection:bg-cyan-400/20"
    >
      {/* ── Ambient layers ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-30 [background:radial-gradient(60%_40%_at_70%_0%,rgba(34,211,238,.15),transparent_60%),radial-gradient(50%_50%_at_10%_10%,rgba(250,204,21,.08),transparent_60%)]" />
      <div
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.06] mix-blend-screen"
        style={{
          backgroundImage: "radial-gradient(#6ee7b7_1px,transparent_1px)",
          backgroundSize: "22px_22px",
        }}
      />
      <div className="spotlight pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_60%)]" />

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/40 border-b border-white/10">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/30 to-cyan-400/5 ring-1 ring-cyan-300/30 grid place-items-center shadow-[0_0_40px_-10px_rgba(34,211,238,.6)]">
              <IconTrain />
            </div>
            <span className="font-semibold tracking-tight text-white/90">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
                SLAIC
              </span>{" "}
              Transit
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="/personalize" className="hover:text-white transition">
              Agents
            </a>
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#demo" className="hover:text-white transition">
              Demo
            </a>
            <Magnetic className="btn-brand-outline gradient-border">
              Sign in
            </Magnetic>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 shadow-[0_0_40px_-12px_rgba(34,211,238,.6)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Real-time • Multimodal • Sri Lanka
            </div>
            <h1 className="hero-title mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Your AI‑Driven{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                Smart
              </span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300">
                {" "}
                Transit
              </span>{" "}
              Companion
            </h1>
            <p className="hero-sub mt-4 text-white/70 text-base sm:text-lg max-w-prose">
              Plan buses, trains, and tuk‑tuks in one tap. Live disruptions,
              fare optimization, and Sinhala/English/Tamil voice.
            </p>

            {/* Planner Card */}
            <div className="hero-cta hero-card mt-8 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-5 sm:p-6 backdrop-blur will-change-transform shadow-[0_10px_60px_-20px_rgba(34,211,238,.35)]">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="group">
                  <span className="text-xs text-white/60">From (stop_id)</span>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                    <IconBus />
                    <input
                      value={fromId}
                      onChange={(e) => setFromId(e.target.value)}
                      placeholder="S06"
                      className="bg-transparent outline-none w-full placeholder:text-white/40"
                    />
                  </div>
                </label>
                <label className="group">
                  <span className="text-xs text-white/60">To (stop_id)</span>
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                  
                  <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 focus-ring-brand">
                    <IconTrain />
                    <input
                      value={toId}
                      onChange={(e) => setToId(e.target.value)}
                      placeholder="S09"
                      className="bg-transparent outline-none w-full placeholder:text-white/40"
                    />
                  </div>
                  </div>
                </label>
              </div>

              {/* ETA slider */}
              <div className="mt-4 grid sm:grid-cols-3 gap-3 items-center">
                <div className="col-span-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Depart in</span>
                    <span>{eta} min</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={eta}
                    onChange={(e) => setEta(parseInt(e.target.value))}
                    className="mt-1 w-full range-brand"
                  />
                </div>
                <div className="text-center rounded-2xl border border-white/10 bg-black/40 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                  <div className="text-[10px] uppercase tracking-wide text-white/60">
                    Est. ETA
                  </div>
                  <div className="text-xl font-semibold">
                    {Math.max(10, 70 - Math.floor(eta / 2))}m
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <Magnetic
                  className="btn-brand brand-grad brand-shine soft-shadow"
                  onClick={handlePlanClick}
                  disabled={loading}
                >
                  {loading ? "Planning…" : "Plan Trip"}
                </Magnetic>

                <button
                  onClick={handleDepartNow}
                  disabled={loading}
                  className="rounded-2xl px-4 py-2 border border-white/15 hover:bg-white/10 transition disabled:opacity-60"
                >
                  Depart Now
                </button>
                <button
                  onClick={() => setVoiceActive((v) => !v)}
                  className="btn-voice rounded-2xl px-4 py-2 border border-white/15 hover:bg-white/10 transition relative overflow-visible"
                >
                  <span
                    className={cx(
                      "mic-pulse absolute inset-0 rounded-2xl -z-10",
                      voiceActive && "ring-2 ring-cyan-400/40"
                    )}
                  />
                  {voiceActive ? "Voice On" : "Voice"}
                </button>
              </div>

              {/* Results */}
              {error && (
                <div className="mt-2 text-xs text-red-300">{error}</div>
              )}

              {plan && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/70 mb-1">
                    {nameOrId(plan.origin_name, plan.origin_stop)} →{" "}
                    {nameOrId(plan.dest_name, plan.dest_stop)}
                  </div>

                  <div className="mt-3 space-y-2">
                    {plan.legs.map((L: any, i: number) =>
                      L.mode === "walk" ? (
                        <div
                          key={i}
                          className="text-xs text-white/80 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          🚶 {nameOrId(L.from_stop_name, L.from_stop)} →{" "}
                          {nameOrId(L.to_stop_name, L.to_stop)} •{" "}
                          {L.depart_time}–{L.arrive_time}
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          {(L.route_type === 2 && "🚆") || "🚌"} Ride{" "}
                          {L.route_id} {L.trip_id} •{" "}
                          {nameOrId(L.from_stop_name, L.from_stop)} →{" "}
                          {nameOrId(L.to_stop_name, L.to_stop)} •{" "}
                          {L.depart_time}–{L.arrive_time}
                        </div>
                      )
                    )}
                  </div>

                  {/* optional: speak a quick summary */}
                  <button
                    onClick={() =>
                      speak(
                        `Depart ${plan.depart_at}, arrive ${plan.arrive_at}, ${plan.duration_min} minutes, ${plan.transfers} transfers.`
                      )
                    }
                    className="mt-3 text-xs underline underline-offset-4 text-white/70 hover:text-white"
                  >
                    Read summary
                  </button>
                </div>
              )}

              {/* Floating chips (visual only) */}
              <div className="relative">
                <div className="float-chip absolute -top-6 right-4 rounded-full bg-emerald-400/20 text-emerald-200 text-xs px-3 py-1 border border-emerald-200/20">
                  Fare Saver
                </div>
                <div className="float-chip absolute -top-6 left-4 rounded-full bg-fuchsia-400/20 text-fuchsia-200 text-xs px-3 py-1 border border-fuchsia-200/20">
                  Disruption Aware
                </div>
              </div>
            </div>

            {/* Modes ticker */}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-white/60 text-sm">
              <IconTrain /> <span>Trains</span>
              <span className="opacity-40">•</span>
              <IconBus /> <span>Buses</span>
              <span className="opacity-40">•</span>
              <IconTuk /> <span>Tuk‑tuks</span>
              <span className="opacity-40">•</span>
              <span>Ride‑hail</span>
            </div>

            <div className="mt-6">
              <LocalKnowledgeWidget
                centerLat={7.05}
                centerLon={80.0}
                radiusKm={8}
              />
            </div>
          </div>

          {/* Map card + stats */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
            <div className="map-card relative aspect-[3/4] rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-4 will-change-transform shadow-[0_30px_80px_-30px_rgba(34,211,238,.35)]">
              <div className="absolute inset-x-10 top-2 h-6 rounded-full bg-white/10 blur-2xl opacity-30" />
              <SriLankaMap />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                <div className="text-xs text-white/60">Delay Alerts</div>
                <div className="mt-1 text-xl font-semibold">
                  <span data-stat={1500} data-suffix="+">
                    0
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                <div className="text-xs text-white/60">Daily Queries</div>
                <div className="mt-1 text-xl font-semibold">
                  <span data-stat={32000}>0</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
                <div className="text-xs text-white/60">Coverage</div>
                <div className="mt-1 text-xl font-semibold">Nationwide</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="reveal text-2xl sm:text-3xl font-semibold">
            Agentic AI, orchestrated.
          </h2>
          <div className="mt-2 h-0.5 w-28 rounded-full brand-grad" />
          <p className="reveal mt-3 text-white/70 max-w-2xl">
            Agents collaborate live to deliver the best trip—data, routes,
            disruptions, fares, language.
          </p>
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Data Aggregation",
                desc: "APIs • GTFS • Crowdsourced • Scraping",
                icon: <IconBus />,
              },
              {
                title: "Route Optimisation",
                desc: "Multi-modal • Time/Cost/Wait",
                icon: <IconTrain />,
              },
              {
                title: "Disruption Management",
                desc: "Reroute on delays, strikes, diversions",
                icon: <IconBus />,
              },
              {
                title: "Personalisation",
                desc: "Learns modes, times, accessibility",
                icon: <IconTrain />,
              },
              {
                title: "Language & Accessibility",
                desc: "Sinhala • Tamil • English • Voice",
                icon: <IconTuk />,
              },
              {
                title: "Fare Optimisation",
                desc: "Passes • Discounts • Best combos",
                icon: <IconBus />,
              },
            ].map((a, i) => (
              <div
                key={i}
                className="agent-card reveal group rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition gradient-border soft-shadow"
              >
                <div className="flex items-center gap-2">
                  {a.icon}
                  <span className="h-18 w-18 rounded-xl brand-grad grid place-items-center text-black">{a.title}</span>
                </div>
                <p className="mt-1 text-white/70 text-sm">{a.desc}</p>
                <div className="mt-3 h-1 w-0 rounded-full brand-grad transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features + demo list */}
      <section id="features" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-black p-6 lg:p-10">
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 order-2 lg:order-1">
                <h3 className="text-2xl font-semibold">Sample Itineraries</h3>
                <div className="mt-3 flex gap-2 text-xs">
                  <button className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10">
                    Sort by Time
                  </button>
                  <button
                    className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg:white/10 hover:bg-white/10"
                    data-by="cost"
                  >
                    Sort by Cost
                  </button>
                  <button
                    className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
                    data-by="transfers"
                  >
                    Fewer Transfers
                  </button>
                </div>
                <div className="itin-list mt-4 space-y-3">
                  <div
                    className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
                    data-time="54"
                    data-cost="180"
                    data-transfers="1"
                  >
                    <div className="text-sm">Train + Bus via Ragama</div>
                    <div className="text-xs text-white/60">
                      54 min • Rs. 180 • 1 transfer
                    </div>
                  </div>
                  <div
                    className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
                    data-time="62"
                    data-cost="120"
                    data-transfers="2"
                  >
                    <div className="text-sm">Bus 138 → Shuttle</div>
                    <div className="text-xs text-white/60">
                      62 min • Rs. 120 • 2 transfers
                    </div>
                  </div>
                  <div
                    className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
                    data-time="48"
                    data-cost="260"
                    data-transfers="0"
                  >
                    <div className="text-sm">Express Train</div>
                    <div className="text-xs text-white/60">
                      48 min • Rs. 260 • 0 transfers
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 w-full">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm text-white/70">Quick Demo</div>
                  <div className="mt-2 rounded-xl bg-white/5 p-3">
                    <div className="text-xs text-white/60">
                      Try a natural question
                    </div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
                      “මට දැන් කොළඹ සිට කෑගල්ලට ඉක්මනින් යන්න.”
                    </div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
                      “எப்படி இப்போ கண்டி போகலாம் குறைந்த செலவில்?”
                    </div>
                    <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
                      “Fastest Colombo Fort → Galle now?”
                    </div>
                    <Magnetic className="mt-3 w-full rounded-xl bg-cyan-400 text-black font-medium py-2 hover:bg-cyan-300 transition">
                      Ask
                    </Magnetic>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="reveal text-3xl font-semibold">
            Experience SLAIC Transit in Action
          </h3>
          <p className="reveal mt-2 text-white/70">
            Try our live demo or personalize your experience with custom agents.
          </p>
          <div className="reveal mt-6 flex flex-wrap items-center justify-center gap-3">
            <Magnetic className="rounded-xl px-5 py-2.5 bg-cyan-400 text-black font-medium hover:bg-cyan-300 transition shadow-[0_10px_30px_-10px_rgba(34,211,238,.6)]">
              Launch Demo
            </Magnetic>
            <a
              href="/personalize"
              className="rounded-xl px-5 py-2.5 border border-white/15 hover:bg-white/10 transition"
            >
              Personalize
            </a>
          </div>
          <div className="mt-10 text-xs text-white/50">
            © {new Date().getFullYear()} SLAIC Transit • Built with Next.js +
            GSAP
          </div>
        </div>
      </section>
    </div>
  );
}
