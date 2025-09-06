"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";

// Register GSAP plugins (browser only)
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Flip);
}

// --- tiny classnames helper
function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// --- Inline icons (no external deps)
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

// --- Animated Sri Lanka map SVG with arcs & moving marker
function SriLankaMap({
  videoSrc = "/media/map.mp4",
  fallbackImageSrc = "/images/k3.png",
}: { videoSrc?: string; fallbackImageSrc?: string }) {
  return (
    <svg className="w-full h-full" viewBox="0 0 600 800" aria-hidden>
      <defs>
        {/* soft glow, optional */}
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4F959D" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#F5C45E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F5C45E" stopOpacity="0" />
        </radialGradient>

        {/* make the PNG a pure luminance mask (white shows, black hides) */}
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

        {/* build the mask using your PNG silhouette */}
        <mask id="lk-img-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="800">
          <image
            href={fallbackImageSrc}       /* /images/k1.png */
            x="0" y="0" width="700" height="900"
            preserveAspectRatio="xMidYMid slice"
            filter="url(#to-luma)"
          />
        </mask>
      </defs>

      {/* ambient glow */}
      <circle cx="350" cy="320" r="240" fill="url(#glow)" />

      {/* ---- EVERYTHING INSIDE THE ISLAND SHAPE ---- */}
      <g mask="url(#lk-img-mask)">
        {/* the video fills the viewBox; the mask cuts it to the PNG shape */}
        <foreignObject x="0" y="0" width="600" height="800">
          <video
            src={videoSrc}              
            autoPlay muted loop playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          >
            <img src={fallbackImageSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </video>
        </foreignObject>

        {/* your animated overlay, still constrained by the same mask */}
        {Array.from({ length: 8 }).map((_, i) => (
          <circle key={i} className="route-dot" cx={150 + i * 50} cy={400 + (i % 2) * 40} r="3" fill="#a5f3fc" />
        ))}
        <path id="main-arc" className="route-arc" d="M150 430 Q300 300 460 380" fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6 10" />
        <path className="route-arc" d="M200 250 Q330 200 430 280" fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6 10" />
        <path className="route-arc" d="M220 520 Q330 430 420 500" fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="6 10" />

        <g id="tuk-car" filter="url(#soft)" transform="translate(-999,-999)">
          <circle r="7" fill="#06b6d4" />
          <circle r="11" fill="#06b6d4" opacity="0.18" />
        </g>
      </g>
    </svg>
  );
}

// --- Magnetic Button
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

// --- Optional: tiny voice waveform
function VoiceMic() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.to(ref.current.querySelectorAll(".bar"), {
      scaleY: 2,
      repeat: -1,
      yoyo: true,
      stagger: 0.1,
      ease: "sine.inOut",
      duration: 0.4,
      transformOrigin: "50% 100%",
    });
  }, []);
  return (
    <div className="flex gap-1 h-6 items-end" ref={ref} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bar w-1 bg-cyan-400 rounded"
          style={{ height: "100%" }}
        />
      ))}
    </div>
  );
}

// --- Demo itineraries with Flip
function DemoItineraries() {
  const [sortBy, setSortBy] = useState<"time" | "cost">("time");
  const container = useRef<HTMLDivElement | null>(null);
  const itineraries = [
    { id: 1, mode: "Train", time: 54, cost: 180 },
    { id: 2, mode: "Bus", time: 62, cost: 120 },
    { id: 3, mode: "Express", time: 48, cost: 260 },
  ];
  const sorted = [...itineraries].sort((a, b) =>
    sortBy === "time" ? a.time - b.time : a.cost - b.cost
  );

  useEffect(() => {
    if (!container.current) return;
    const state = Flip.getState(
      container.current.querySelectorAll(".itinerary")
    );
    Flip.from(state, { duration: 0.6, ease: "power2.inOut", absolute: true });
  }, [sortBy]);

  return (
    <div>
      <div className="flex gap-3 mb-3">
        <Magnetic
          className={cx(
            "px-3 py-1 rounded-xl text-sm",
            sortBy === "time" ? "bg-cyan-400 text-black" : "bg-white/10"
          )}
          onClick={() => setSortBy("time")}
        >
          Sort by Time
        </Magnetic>
        <Magnetic
          className={cx(
            "px-3 py-1 rounded-xl text-sm",
            sortBy === "cost" ? "bg-cyan-400 text-black" : "bg-white/10"
          )}
          onClick={() => setSortBy("cost")}
        >
          Sort by Cost
        </Magnetic>
      </div>
      <div ref={container} className="space-y-2">
        {sorted.map((i) => (
          <div
            key={i.id}
            className="itinerary flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span>{i.mode}</span>
            <span className="text-white/60">
              {i.time}m • Rs.{i.cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const root = useRef<HTMLDivElement | null>(null);
  const [eta, setEta] = useState(30);
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      // === Cursor spotlight ===
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

      // === Hero reveal ===
      gsap.from(".hero-badge, .hero-title, .hero-sub, .hero-cta", {
        y: 24,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
      });

      // === Floating chips ===
      gsap.to(".float-chip", {
        y: -10,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: "sine.inOut",
        stagger: 0.15,
      });

      // === Animated arcs ===
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

      // === Route dots pulse ===
      gsap.to(".route-dot", {
        scale: 1.6,
        transformOrigin: "center",
        repeat: -1,
        yoyo: true,
        duration: 1.6,
        ease: "sine.inOut",
        stagger: 0.08,
      });

      // === Tuk along path (scroll-scrub) ===
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

      // === Stats counters ===
      const toNumber = (el: HTMLElement, end: number, suffix = "") => {
        gsap.fromTo(
          { val: 0 },
          { val: 0 },
          {
            val: end,
            duration: 2,
            ease: "power3.out",
            onUpdate() {
              el.textContent = `${Math.round(this.targets()[0].val)}${suffix}`;
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

      // === Section reveals ===
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // === Parallax on hero card + map ===
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

      // === Agent hand-off animation on Plan ===
      const plan = document.querySelector(".btn-plan");
      const agentCards = gsap.utils.toArray<HTMLElement>(".agent-card");
      plan?.addEventListener("click", () => {
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

      // === Voice mic pulse toggler ===
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

      // === Flip sort for static demo list ===
      const sortButtons = gsap.utils.toArray<HTMLButtonElement>(".sort-btn");
      const list = document.querySelector(".itin-list") as HTMLElement | null;
      sortButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!list) return;
          // @ts-expect-error using gsap Flip
          const state = gsap.Flip.getState(".itin-item");
          const items = Array.from(
            list.querySelectorAll<HTMLElement>(".itin-item")
          );
          const by = btn.dataset.by as
            | "time"
            | "cost"
            | "transfers"
            | undefined;
          items.sort((a, b) => {
            const av = Number(a.dataset[by as any]);
            const bv = Number(b.dataset[by as any]);
            return av - bv;
          });
          items.forEach((i) => list.appendChild(i));
          // @ts-expect-error using gsap Flip
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

  return (
    <div ref={root} className="min-h-screen bg-black text-white">
      {/* --- Dynamic cursor spotlight --- */}
      <div className="spotlight pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_60%)]" />

      {/* --- Background grid --- */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(#6ee7b7 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* --- Navbar --- */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-cyan-400/20 ring-1 ring-cyan-300/30 grid place-items-center">
              <IconTrain />
            </div>
            <span className="font-semibold tracking-tight">SLAIC Transit</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="/personalize" className="hover:text-white">
              Agents
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#demo" className="hover:text-white">
              Demo
            </a>
            <Magnetic className="ml-2 rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 transition">
              Sign in
            </Magnetic>
          </div>
        </nav>
      </header>

      {/* --- Hero --- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Real-time • Multimodal • Sri Lanka
            </div>
            <h1 className="hero-title mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
              Your AI-Driven{" "}
              <span  style={{ color:"#FCC61D" }}>Smart Transit</span> Companion
            </h1>
            <p className="hero-sub mt-4 text-white/70 text-base sm:text-lg max-w-prose">
              Plan buses, trains, and tuk-tuks in one tap. Live disruptions,
              fare optimization, and Sinhala/English/Tamil voice.
            </p>

            {/* Planner Card */}
            <div className="hero-cta hero-card mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur will-change-transform">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="group">
                  <span className="text-xs text-white/60">From</span>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40">
                    <IconBus />
                    <input
                      placeholder="Galle Face Green"
                      className="bg-transparent outline-none w-full placeholder:text-white/40"
                    />
                  </div>
                </label>
                <label className="group">
                  <span className="text-xs text-white/60">To</span>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40">
                    <IconTrain />
                    <input
                      placeholder="Kandy Railway Station"
                      className="bg-transparent outline-none w-full placeholder:text-white/40"
                    />
                  </div>
                </label>
              </div>

              {/* Interactive ETA slider */}
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
                    className="mt-1 w-full accent-cyan-400"
                  />
                </div>
                <div className="text-center rounded-xl border border-white/10 bg-black/40 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-white/60">
                    Est. ETA
                  </div>
                  <div className="text-xl font-semibold">
                    {Math.max(10, 70 - Math.floor(eta / 2))}m
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <Magnetic className="btn-plan rounded-xl px-4 py-2 bg-cyan-400 text-black font-medium hover:bg-cyan-300 transition">
                  Plan Trip
                </Magnetic>
                <button className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/10 transition">
                  Depart Now
                </button>
                <button
                  onClick={() => setVoiceActive((v) => !v)}
                  className="btn-voice rounded-xl px-4 py-2 border border-white/15 hover:bg-white/10 transition relative overflow-visible"
                >
                  <span
                    className={cx(
                      "mic-pulse absolute inset-0 rounded-xl -z-10",
                      voiceActive && "ring-2 ring-cyan-400/40"
                    )}
                  ></span>
                  Voice
                </button>
              </div>

              {/* Floating capability chips */}
              <div className="relative">
                <div className="float-chip absolute -top-6 right-4 rounded-full bg-emerald-400/20 text-emerald-200 text-xs px-3 py-1 border border-emerald-200/20">
                  Fare Saver
                </div>
                <div className="float-chip absolute -top-6 left-4 rounded-full bg-fuchsia-400/20 text-fuchsia-200 text-xs px-3 py-1 border border-fuchsia-200/20">
                  Disruption Aware
                </div>
              </div>
            </div>

            {/* Modes Ticker */}
            <div className="mt-6 flex items-center gap-3 text-white/60 text-sm">
              <IconTrain /> <span>Trains</span>
              <span className="opacity-40">•</span>
              <IconBus /> <span>Buses</span>
              <span className="opacity-40">•</span>
              <IconTuk /> <span>Tuk-tuks</span>
              <span className="opacity-40">•</span>
              <span>Ride-hail</span>
            </div>
          </div>

          {/* Right: Animated Map (parallax + scroll scrub) */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
            <div className="map-card relative aspect-[3/4] rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-4 will-change-transform">
              <SriLankaMap />
            </div>
            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-white/10 bg-white/5 py-3">
                <div className="text-xs text-white/60">Delay Alerts</div>
                <div className="mt-1 text-xl font-semibold">
                  <span data-stat={1500} data-suffix="+">
                    0
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 py-3">
                <div className="text-xs text-white/60">Daily Queries</div>
                <div className="mt-1 text-xl font-semibold">
                  <span data-stat={32000}>0</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 py-3">
                <div className="text-xs text-white/60">Coverage</div>
                <div className="mt-1 text-xl font-semibold">Nationwide</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Agents Strip --- */}
      <section id="agents" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="reveal text-2xl sm:text-3xl font-semibold">
            Agentic AI, orchestrated.
          </h2>
          <p className="reveal mt-2 text-white/70 max-w-2xl">
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
                className="agent-card reveal group rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition"
              >
                <div className="flex items-center gap-2 text-cyan-300">
                  {a.icon}
                  <span className="font-medium">{a.title}</span>
                </div>
                <p className="mt-1 text-white/70 text-sm">{a.desc}</p>
                <div className="mt-3 h-1 w-0 bg-cyan-400 transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Feature Banner: Quick demo + Itinerary Flip List --- */}
      <section id="features" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-black p-6 lg:p-10">
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 order-2 lg:order-1">
                <h3 className="text-2xl font-semibold">Sample Itineraries</h3>
                <div className="mt-3 flex gap-2 text-xs">
                  <button
                    className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
                    data-by="time"
                  >
                    Sort by Time
                  </button>
                  <button
                    className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
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

      {/* --- CTA --- */}
      <section id="demo" className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="reveal text-3xl font-semibold">
            Ready to wow SLAIC judges?
          </h3>
          <p className="reveal mt-2 text-white/70">
            Plug your agents into this front-end and demo real, live planning in
            minutes.
          </p>
          <div className="reveal mt-6 flex flex-wrap items-center justify-center gap-3">
            <Magnetic className="rounded-xl px-5 py-2.5 bg-cyan-400 text-black font-medium hover:bg-cyan-300 transition">
              Launch Demo
            </Magnetic>
            <button className="rounded-xl px-5 py-2.5 border border-white/15 hover:bg-white/10 transition">
              View Docs
            </button>
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

// "use client";
// import type { ButtonHTMLAttributes, ReactNode } from "react";
// import { useEffect, useRef, useState } from "react";
// import { gsap } from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";
// import { MotionPathPlugin } from "gsap/MotionPathPlugin";
// import { Flip } from "gsap/Flip";

// // Register GSAP plugins (browser only)
// if (typeof window !== "undefined") {
//   gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Flip);
// }

// // --- tiny classnames helper
// function cx(...classes: (string | false | null | undefined)[]) {
//   return classes.filter(Boolean).join(" ");
// }

// // --- Inline icons (no external deps)
// function IconTrain({ size = 20 }: { size?: number }) {
//   return (
//     <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
//       <path
//         fill="currentColor"
//         d="M12 2c-4.42 0-8 1.79-8 4v9c0 1.66 1.34 3 3 3l-2 2h2.5l2-2h5l2 2H19l-2-2c1.66 0 3-1.34 3-3V6c0-2.21-3.58-4-8-4Zm-4 3h8c1.1 0 2 .45 2 1v4H6V6c0-.55.9-1 2-1Zm-2 9h12v1c0 .55-.9 1-2 1H10c-1.1 0-2-.45-2-1v-1Zm1 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
//       />
//     </svg>
//   );
// }
// function IconBus({ size = 20 }: { size?: number }) {
//   return (
//     <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
//       <path
//         fill="currentColor"
//         d="M12 2c-4.97 0-9 1.12-9 5v8.5c0 .83.67 1.5 1.5 1.5h.5V20a2 2 0 0 0 4 0v-1h6v1a2 2 0 0 0 4 0v-1h.5c.83 0 1.5-.67 1.5-1.5V7c0-3.88-4.03-5-9-5Zm-6 5h12c.55 0 1 .45 1 1v4H5V8c0-.55.45-1 1-1Zm-1 7h14v1H5v-1Zm2 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm10 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
//       />
//     </svg>
//   );
// }
// function IconTuk({ size = 20 }: { size?: number }) {
//   return (
//     <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
//       <path
//         fill="currentColor"
//         d="M3 7c0-1.1.9-2 2-2h6l2 3h3a3 3 0 0 1 3 3v4c0 1.1-.9 2-2 2h-1a2.5 2.5 0 1 1-5 0H9a2.5 2.5 0 1 1-5 0H4c-.55 0-1-.45-1-1V7Zm2 1v4h5l-2-4H5Zm12 4c0-1.1-.9-2-2-2h-2l1 2h3Z"
//       />
//     </svg>
//   );
// }

// // --- Animated Sri Lanka map SVG with arcs & moving marker
// function SriLankaMap() {
//   return (
//     <svg className="w-full h-full" viewBox="0 0 600 800" aria-hidden>
//       <defs>
//         <radialGradient id="glow" cx="50%" cy="40%" r="60%">
//           <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
//           <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.15" />
//           <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
//         </radialGradient>
//         <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
//           <feGaussianBlur stdDeviation="6" />
//         </filter>
//       </defs>
//       <circle cx="300" cy="320" r="240" fill="url(#glow)" />
//       <path
//         id="lk-outline"
//         d="M330 100c-90 10-160 90-180 150-40 120-20 210 60 320 40 55 105 95 165 85 55-9 77-58 85-125 6-56-3-122-15-170-10-39-8-62 5-100 14-41-16-95-50-120-25-18-45-44-70-40z"
//         fill="none"
//         stroke="rgba(255,255,255,0.18)"
//         strokeWidth="2"
//       />

//       {/* Route dots */}
//       {Array.from({ length: 8 }).map((_, i) => (
//         <circle
//           key={i}
//           className="route-dot"
//           cx={140 + i * 50}
//           cy={200 + (i % 2) * 40}
//           r="3"
//           fill="#a5f3fc"
//         />
//       ))}

//       {/* Arcs */}
//       <path
//         id="main-arc"
//         className="route-arc"
//         d="M150 430 Q300 300 460 380"
//         fill="none"
//         stroke="#67e8f9"
//         strokeWidth="2"
//         strokeDasharray="6 10"
//       />
//       <path
//         className="route-arc"
//         d="M200 250 Q330 200 430 280"
//         fill="none"
//         stroke="#67e8f9"
//         strokeWidth="2"
//         strokeDasharray="6 10"
//       />
//       <path
//         className="route-arc"
//         d="M220 520 Q330 430 420 500"
//         fill="none"
//         stroke="#67e8f9"
//         strokeWidth="2"
//         strokeDasharray="6 10"
//       />

//       {/* Moving marker */}
//       <g id="tuk-car" filter="url(#soft)" transform="translate(-999,-999)">
//         <circle r="7" fill="#06b6d4" />
//         <circle r="11" fill="#06b6d4" opacity="0.18" />
//       </g>
//     </svg>
//   );
// }

// // --- Magnetic Button (now forwards props like onClick)
// function Magnetic({
//   children,
//   className,
//   ...rest
// }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
//   const ref = useRef<HTMLButtonElement | null>(null);
//   useEffect(() => {
//     if (!ref.current) return;
//     const el = ref.current;
//     const onMove = (e: MouseEvent) => {
//       const r = el.getBoundingClientRect();
//       const x = e.clientX - (r.left + r.width / 2);
//       const y = e.clientY - (r.top + r.height / 2);
//       gsap.to(el, {
//         x: x * 0.2,
//         y: y * 0.2,
//         duration: 0.3,
//         ease: "power3.out",
//       });
//     };
//     const onLeave = () =>
//       gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: "power3.out" });
//     el.addEventListener("mousemove", onMove);
//     el.addEventListener("mouseleave", onLeave);
//     return () => {
//       el.removeEventListener("mousemove", onMove);
//       el.removeEventListener("mouseleave", onLeave);
//     };
//   }, []);
//   return (
//     <button ref={ref} className={className} {...rest}>
//       {children}
//     </button>
//   );
// }

// // --- Optional: tiny voice waveform (unused in layout but kept for reuse)
// function VoiceMic() {
//   const ref = useRef<HTMLDivElement | null>(null);
//   useEffect(() => {
//     if (!ref.current) return;
//     gsap.to(ref.current.querySelectorAll(".bar"), {
//       scaleY: 2,
//       repeat: -1,
//       yoyo: true,
//       stagger: 0.1,
//       ease: "sine.inOut",
//       duration: 0.4,
//       transformOrigin: "50% 100%",
//     });
//   }, []);
//   return (
//     <div className="flex gap-1 h-6 items-end" ref={ref} aria-hidden>
//       {Array.from({ length: 5 }).map((_, i) => (
//         <div
//           key={i}
//           className="bar w-1 bg-cyan-400 rounded"
//           style={{ height: "100%" }}
//         />
//       ))}
//     </div>
//   );
// }

// // --- Demo itineraries with Flip (kept for future wiring)
// function DemoItineraries() {
//   const [sortBy, setSortBy] = useState<"time" | "cost">("time");
//   const container = useRef<HTMLDivElement | null>(null);
//   const itineraries = [
//     { id: 1, mode: "Train", time: 54, cost: 180 },
//     { id: 2, mode: "Bus", time: 62, cost: 120 },
//     { id: 3, mode: "Express", time: 48, cost: 260 },
//   ];
//   const sorted = [...itineraries].sort((a, b) =>
//     sortBy === "time" ? a.time - b.time : a.cost - b.cost
//   );

//   useEffect(() => {
//     if (!container.current) return;
//     const state = Flip.getState(
//       container.current.querySelectorAll(".itinerary")
//     );
//     Flip.from(state, { duration: 0.6, ease: "power2.inOut", absolute: true });
//   }, [sortBy]);

//   return (
//     <div>
//       <div className="flex gap-3 mb-3">
//         <Magnetic
//           className={cx(
//             "px-3 py-1 rounded-xl text-sm",
//             sortBy === "time" ? "bg-cyan-400 text-black" : "bg-white/10"
//           )}
//           onClick={() => setSortBy("time")}
//         >
//           Sort by Time
//         </Magnetic>
//         <Magnetic
//           className={cx(
//             "px-3 py-1 rounded-xl text-sm",
//             sortBy === "cost" ? "bg-cyan-400 text-black" : "bg-white/10"
//           )}
//           onClick={() => setSortBy("cost")}
//         >
//           Sort by Cost
//         </Magnetic>
//       </div>
//       <div ref={container} className="space-y-2">
//         {sorted.map((i) => (
//           <div
//             key={i.id}
//             className="itinerary flex justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
//           >
//             <span>{i.mode}</span>
//             <span className="text-white/60">
//               {i.time}m • Rs.{i.cost}
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default function Home() {
//   const root = useRef<HTMLDivElement | null>(null);
//   const [eta, setEta] = useState(30);
//   const [voiceActive, setVoiceActive] = useState(false);

//   useEffect(() => {
//     if (!root.current) return;
//     const ctx = gsap.context(() => {
//       // === DEV SELF‑TESTS (lightweight) ===
//       console.groupCollapsed("SLAIC Home Self‑Tests");
//       console.assert(
//         typeof IconTrain === "function",
//         "IconTrain should be defined"
//       );
//       console.assert(
//         typeof IconBus === "function",
//         "IconBus should be defined"
//       );
//       console.assert(
//         typeof IconTuk === "function",
//         "IconTuk should be defined"
//       );
//       console.groupEnd();

//       // === Cursor spotlight ===
//       const spotlight = document.querySelector(
//         ".spotlight"
//       ) as HTMLDivElement | null;
//       const onMove = (e: MouseEvent) => {
//         if (!spotlight) return;
//         const x = e.clientX,
//           y = e.clientY;
//         gsap.to(spotlight, {
//           x: x - window.innerWidth / 2,
//           y: y - window.innerHeight / 2,
//           duration: 0.3,
//           ease: "power3.out",
//         });
//       };
//       window.addEventListener("mousemove", onMove);

//       // === Hero reveal ===
//       gsap.from(".hero-badge, .hero-title, .hero-sub, .hero-cta", {
//         y: 24,
//         opacity: 0,
//         stagger: 0.12,
//         duration: 0.9,
//         ease: "power3.out",
//       });

//       // === Floating chips ===
//       gsap.to(".float-chip", {
//         y: -10,
//         repeat: -1,
//         yoyo: true,
//         duration: 2.2,
//         ease: "sine.inOut",
//         stagger: 0.15,
//       });

//       // === Animated arcs ===
//       gsap.utils.toArray<SVGPathElement>(".route-arc").forEach((p, i) => {
//         const length = p.getTotalLength();
//         gsap.set(p, { strokeDashoffset: length });
//         gsap.to(p, {
//           strokeDashoffset: 0,
//           duration: 2 + i * 0.4,
//           ease: "power2.out",
//           repeat: -1,
//           repeatDelay: 1.2,
//           yoyo: true,
//         });
//       });

//       // === Route dots pulse ===
//       gsap.to(".route-dot", {
//         scale: 1.6,
//         transformOrigin: "center",
//         repeat: -1,
//         yoyo: true,
//         duration: 1.6,
//         ease: "sine.inOut",
//         stagger: 0.08,
//       });

//       // === Tuk along path (scroll‑scrub) ===
//       const mapCard = document.querySelector(".map-card");
//       if (mapCard) {
//         const scrollTl = gsap.timeline({ defaults: { ease: "none" } });
//         scrollTl.to("#tuk-car", {
//           motionPath: {
//             path: "#main-arc",
//             align: "#main-arc",
//             autoRotate: false,
//             start: 0,
//             end: 1,
//           },
//         });
//         ScrollTrigger.create({
//           animation: scrollTl,
//           trigger: mapCard,
//           start: "top bottom",
//           end: "bottom top",
//           scrub: 0.6,
//         });
//       }

//       // === Stats counters ===
//       const toNumber = (el: HTMLElement, end: number, suffix = "") => {
//         gsap.fromTo(
//           { val: 0 },
//           { val: 0 },
//           {
//             val: end,
//             duration: 2,
//             ease: "power3.out",
//             onUpdate: function () {
//               el.textContent = `${Math.round(
//                 (this as any).targets()[0].val
//               )}${suffix}`;
//             },
//           }
//         );
//       };
//       document.querySelectorAll("[data-stat]").forEach((n) => {
//         const el = n as HTMLElement;
//         const end = Number(el.dataset.stat || 0);
//         ScrollTrigger.create({
//           trigger: el,
//           start: "top 85%",
//           once: true,
//           onEnter: () => toNumber(el, end, el.dataset.suffix || ""),
//         });
//       });

//       // === Section reveals ===
//       gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
//         gsap.from(el, {
//           y: 24,
//           opacity: 0,
//           duration: 0.9,
//           ease: "power3.out",
//           scrollTrigger: { trigger: el, start: "top 85%" },
//         });
//       });

//       // === Parallax on hero card + map ===
//       gsap.utils
//         .toArray<HTMLElement>([".hero-card", ".map-card"])
//         .forEach((el) => {
//           el.addEventListener("mousemove", (e) => {
//             const r = el.getBoundingClientRect();
//             const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
//             const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
//             gsap.to(el, {
//               rotateX: dy * -6,
//               rotateY: dx * 6,
//               translateZ: 10,
//               transformPerspective: 600,
//               duration: 0.4,
//             });
//           });
//           el.addEventListener("mouseleave", () =>
//             gsap.to(el, {
//               rotateX: 0,
//               rotateY: 0,
//               translateZ: 0,
//               duration: 0.6,
//             })
//           );
//         });

//       // === Agent hand‑off animation on Plan ===
//       const plan = document.querySelector(".btn-plan");
//       const agentCards = gsap.utils.toArray<HTMLElement>(".agent-card");
//       plan?.addEventListener("click", () => {
//         const tl = gsap.timeline();
//         agentCards.forEach((card, i) => {
//           tl.to(
//             card,
//             {
//               boxShadow: "0 0 0 2px rgba(34,211,238,0.6)",
//               backgroundColor: "rgba(34,211,238,0.08)",
//               duration: 0.25,
//               ease: "power1.out",
//             },
//             i * 0.12
//           ).to(
//             card,
//             {
//               boxShadow: "0 0 0 0 rgba(34,211,238,0)",
//               backgroundColor: "rgba(255,255,255,0.04)",
//               duration: 0.35,
//             },
//             "+=0.15"
//           );
//         });
//       });

//       // === Voice mic pulse toggler ===
//       const mic = document.querySelector(".btn-voice");
//       let pulse: gsap.core.Tween | null = null;
//       const startPulse = () => {
//         if (pulse) pulse.kill();
//         pulse = gsap.to(".mic-pulse", {
//           scale: 1.06,
//           boxShadow: "0 0 0 12px rgba(34,211,238,0)",
//           repeat: -1,
//           yoyo: false,
//           duration: 0.6,
//         });
//       };
//       const stopPulse = () => {
//         if (pulse) {
//           pulse.kill();
//           pulse = null;
//         }
//       };
//       mic?.addEventListener("click", () => {
//         const active = mic.classList.toggle("is-listening");
//         if (active) startPulse();
//         else stopPulse();
//       });

//       // === Flip sort for static demo list ===
//       const sortButtons = gsap.utils.toArray<HTMLButtonElement>(".sort-btn");
//       const list = document.querySelector(".itin-list") as HTMLElement | null;
//       sortButtons.forEach((btn) => {
//         btn.addEventListener("click", () => {
//           if (!list) return;
//           const state = (gsap as any).Flip.getState(".itin-item");
//           const items = Array.from(
//             list.querySelectorAll<HTMLElement>(".itin-item")
//           );
//           const by = btn.dataset.by as
//             | "time"
//             | "cost"
//             | "transfers"
//             | undefined;
//           items.sort((a, b) => {
//             const av = Number(a.dataset[by as any]);
//             const bv = Number(b.dataset[by as any]);
//             return av - bv;
//           });
//           items.forEach((i) => list.appendChild(i));
//           (gsap as any).Flip.from(state, {
//             duration: 0.6,
//             ease: "power2.inOut",
//           });
//         });
//       });

//       return () => {
//         window.removeEventListener("mousemove", onMove);
//         ScrollTrigger.getAll().forEach((s) => s.kill());
//       };
//     }, root);
//     return () => ctx.revert();
//   }, []);

//   return (
//     <div ref={root} className="min-h-screen bg-black text-white">
//       {/* --- Dynamic cursor spotlight --- */}
//       <div className="spotlight pointer-events-none fixed left-1/2 top-1/2 -z-10 h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_60%)]" />

//       {/* --- Background grid --- */}
//       <div
//         className="pointer-events-none fixed inset-0 -z-20 opacity-[0.08]"
//         style={{
//           backgroundImage: "radial-gradient(#6ee7b7 1px, transparent 1px)",
//           backgroundSize: "22px 22px",
//         }}
//       />

//       {/* --- Navbar --- */}
//       <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
//         <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
//           <div className="flex items-center gap-3">
//             <div className="h-8 w-8 rounded-xl bg-cyan-400/20 ring-1 ring-cyan-300/30 grid place-items-center">
//               <IconTrain />
//             </div>
//             <span className="font-semibold tracking-tight">SLAIC Transit</span>
//           </div>
//           <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
//             <a href="#agents" className="hover:text-white">
//               Agents
//             </a>
//             <a href="#features" className="hover:text-white">
//               Features
//             </a>
//             <a href="#demo" className="hover:text-white">
//               Demo
//             </a>
//             <Magnetic className="ml-2 rounded-xl px-4 py-2 bg-white/10 hover:bg-white/20 transition">
//               Sign in
//             </Magnetic>
//           </div>
//         </nav>
//       </header>

//       {/* --- Hero --- */}
//       <section className="relative overflow-hidden">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20 grid lg:grid-cols-2 gap-10 items-center">
//           <div>
//             <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
//               <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
//               Real‑time • Multimodal • Sri Lanka
//             </div>
//             <h1 className="hero-title mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
//               Your AI‑Driven{" "}
//               <span className="text-cyan-300">Smart Transit</span> Companion
//             </h1>
//             <p className="hero-sub mt-4 text-white/70 text-base sm:text-lg max-w-prose">
//               Plan buses, trains, and tuk‑tuks in one tap. Live disruptions,
//               fare optimization, and Sinhala/English/Tamil voice.
//             </p>

//             {/* Planner Card (interactive) */}
//             <div className="hero-cta hero-card mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur will-change-transform">
//               <div className="grid sm:grid-cols-2 gap-3">
//                 <label className="group">
//                   <span className="text-xs text-white/60">From</span>
//                   <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40">
//                     <IconBus />
//                     <input
//                       placeholder="Galle Face Green"
//                       className="bg-transparent outline-none w-full placeholder:text-white/40"
//                     />
//                   </div>
//                 </label>
//                 <label className="group">
//                   <span className="text-xs text-white/60">To</span>
//                   <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 focus-within:border-cyan-400/40">
//                     <IconTrain />
//                     <input
//                       placeholder="Kandy Railway Station"
//                       className="bg-transparent outline-none w-full placeholder:text-white/40"
//                     />
//                   </div>
//                 </label>
//               </div>

//               {/* Interactive ETA slider */}
//               <div className="mt-4 grid sm:grid-cols-3 gap-3 items-center">
//                 <div className="col-span-2">
//                   <div className="flex justify-between text-xs text-white/60">
//                     <span>Depart in</span>
//                     <span>{eta} min</span>
//                   </div>
//                   <input
//                     type="range"
//                     min={0}
//                     max={120}
//                     value={eta}
//                     onChange={(e) => setEta(parseInt(e.target.value))}
//                     className="mt-1 w-full accent-cyan-400"
//                   />
//                 </div>
//                 <div className="text-center rounded-xl border border-white/10 bg-black/40 py-2">
//                   <div className="text-[10px] uppercase tracking-wide text-white/60">
//                     Est. ETA
//                   </div>
//                   <div className="text-xl font-semibold">
//                     {Math.max(10, 70 - Math.floor(eta / 2))}m
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-3 flex flex-col sm:flex-row gap-3">
//                 <Magnetic className="btn-plan rounded-xl px-4 py-2 bg-cyan-400 text-black font-medium hover:bg-cyan-300 transition">
//                   Plan Trip
//                 </Magnetic>
//                 <button className="rounded-xl px-4 py-2 border border-white/15 hover:bg-white/10 transition">
//                   Depart Now
//                 </button>
//                 <button
//                   onClick={() => setVoiceActive((v) => !v)}
//                   className="btn-voice rounded-xl px-4 py-2 border border-white/15 hover:bg-white/10 transition relative overflow-visible"
//                 >
//                   <span
//                     className={cx(
//                       "mic-pulse absolute inset-0 rounded-xl -z-10",
//                       voiceActive && "ring-2 ring-cyan-400/40"
//                     )}
//                   ></span>
//                   Voice
//                 </button>
//               </div>

//               {/* Floating capability chips */}
//               <div className="relative">
//                 <div className="float-chip absolute -top-6 right-4 rounded-full bg-emerald-400/20 text-emerald-200 text-xs px-3 py-1 border border-emerald-200/20">
//                   Fare Saver
//                 </div>
//                 <div className="float-chip absolute -top-6 left-4 rounded-full bg-fuchsia-400/20 text-fuchsia-200 text-xs px-3 py-1 border border-fuchsia-200/20">
//                   Disruption Aware
//                 </div>
//               </div>
//             </div>

//             {/* Modes Ticker */}
//             <div className="mt-6 flex items-center gap-3 text-white/60 text-sm">
//               <IconTrain /> <span>Trains</span>
//               <span className="opacity-40">•</span>
//               <IconBus /> <span>Buses</span>
//               <span className="opacity-40">•</span>
//               <IconTuk /> <span>Tuk‑tuks</span>
//               <span className="opacity-40">•</span>
//               <span>Ride‑hail</span>
//             </div>
//           </div>

//           {/* Right: Animated Map (parallax + scroll scrub) */}
//           <div className="relative">
//             <div className="absolute -inset-6 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
//             <div className="map-card relative aspect-[3/4] rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-4 will-change-transform">
//               <SriLankaMap />
//             </div>
//             {/* Stats */}
//             <div className="mt-4 grid grid-cols-3 gap-3 text-center">
//               <div className="rounded-xl border border-white/10 bg-white/5 py-3">
//                 <div className="text-xs text-white/60">Delay Alerts</div>
//                 <div className="mt-1 text-xl font-semibold">
//                   <span data-stat={1500} data-suffix="+">
//                     0
//                   </span>
//                 </div>
//               </div>
//               <div className="rounded-xl border border-white/10 bg-white/5 py-3">
//                 <div className="text-xs text-white/60">Daily Queries</div>
//                 <div className="mt-1 text-xl font-semibold">
//                   <span data-stat={32000}>0</span>
//                 </div>
//               </div>
//               <div className="rounded-xl border border-white/10 bg-white/5 py-3">
//                 <div className="text-xs text-white/60">Coverage</div>
//                 <div className="mt-1 text-xl font-semibold">Nationwide</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* --- Agents Strip --- */}
//       <section id="agents" className="py-12 lg:py-16">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <h2 className="reveal text-2xl sm:text-3xl font-semibold">
//             Agentic AI, orchestrated.
//           </h2>
//           <p className="reveal mt-2 text-white/70 max-w-2xl">
//             Agents collaborate live to deliver the best trip—data, routes,
//             disruptions, fares, language.
//           </p>
//           <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {[
//               {
//                 title: "Data Aggregation",
//                 desc: "APIs • GTFS • Crowdsourced • Scraping",
//                 icon: <IconBus />,
//               },
//               {
//                 title: "Route Optimisation",
//                 desc: "Multi‑modal • Time/Cost/Wait",
//                 icon: <IconTrain />,
//               },
//               {
//                 title: "Disruption Management",
//                 desc: "Reroute on delays, strikes, diversions",
//                 icon: <IconBus />,
//               },
//               {
//                 title: "Personalisation",
//                 desc: "Learns modes, times, accessibility",
//                 icon: <IconTrain />,
//               },
//               {
//                 title: "Language & Accessibility",
//                 desc: "Sinhala • Tamil • English • Voice",
//                 icon: <IconTuk />,
//               },
//               {
//                 title: "Fare Optimisation",
//                 desc: "Passes • Discounts • Best combos",
//                 icon: <IconBus />,
//               },
//             ].map((a, i) => (
//               <div
//                 key={i}
//                 className="agent-card reveal group rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06] transition"
//               >
//                 <div className="flex items-center gap-2 text-cyan-300">
//                   {a.icon}
//                   <span className="font-medium">{a.title}</span>
//                 </div>
//                 <p className="mt-1 text-white/70 text-sm">{a.desc}</p>
//                 <div className="mt-3 h-1 w-0 bg-cyan-400 transition-all duration-500 group-hover:w-full" />
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* --- Feature Banner: Quick demo + Itinerary Flip List --- */}
//       <section id="features" className="py-12 lg:py-16">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//           <div className="reveal rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-black p-6 lg:p-10">
//             <div className="grid lg:grid-cols-3 gap-6 items-start">
//               <div className="lg:col-span-2 order-2 lg:order-1">
//                 <h3 className="text-2xl font-semibold">Sample Itineraries</h3>
//                 <div className="mt-3 flex gap-2 text-xs">
//                   <button
//                     className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
//                     data-by="time"
//                   >
//                     Sort by Time
//                   </button>
//                   <button
//                     className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
//                     data-by="cost"
//                   >
//                     Sort by Cost
//                   </button>
//                   <button
//                     className="sort-btn rounded-full border border-white/15 px-3 py-1 hover:bg-white/10"
//                     data-by="transfers"
//                   >
//                     Fewer Transfers
//                   </button>
//                 </div>
//                 <div className="itin-list mt-4 space-y-3">
//                   <div
//                     className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
//                     data-time="54"
//                     data-cost="180"
//                     data-transfers="1"
//                   >
//                     <div className="text-sm">Train + Bus via Ragama</div>
//                     <div className="text-xs text-white/60">
//                       54 min • Rs. 180 • 1 transfer
//                     </div>
//                   </div>
//                   <div
//                     className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
//                     data-time="62"
//                     data-cost="120"
//                     data-transfers="2"
//                   >
//                     <div className="text-sm">Bus 138 → Shuttle</div>
//                     <div className="text-xs text-white/60">
//                       62 min • Rs. 120 • 2 transfers
//                     </div>
//                   </div>
//                   <div
//                     className="itin-item rounded-xl border border-white/10 bg-white/5 p-4"
//                     data-time="48"
//                     data-cost="260"
//                     data-transfers="0"
//                   >
//                     <div className="text-sm">Express Train</div>
//                     <div className="text-xs text-white/60">
//                       48 min • Rs. 260 • 0 transfers
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div className="order-1 lg:order-2 w-full">
//                 <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
//                   <div className="text-sm text-white/70">Quick Demo</div>
//                   <div className="mt-2 rounded-xl bg-white/5 p-3">
//                     <div className="text-xs text-white/60">
//                       Try a natural question
//                     </div>
//                     <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
//                       “මට දැන් කොළඹ සිට කෑගල්ලට ඉක්මනින් යන්න.”
//                     </div>
//                     <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
//                       “எப்படி இப்போ கண்டி போகலாம் குறைந்த செலவில்?”
//                     </div>
//                     <div className="mt-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2">
//                       “Fastest Colombo Fort → Galle now?”
//                     </div>
//                     <Magnetic className="mt-3 w-full rounded-xl bg-cyan-400 text-black font-medium py-2 hover:bg-cyan-300 transition">
//                       Ask
//                     </Magnetic>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* --- CTA --- */}
//       <section id="demo" className="py-12 lg:py-16">
//         <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
//           <h3 className="reveal text-3xl font-semibold">
//             Ready to wow SLAIC judges?
//           </h3>
//           <p className="reveal mt-2 text-white/70">
//             Plug your agents into this front‑end and demo real, live planning in
//             minutes.
//           </p>
//           <div className="reveal mt-6 flex flex-wrap items-center justify-center gap-3">
//             <Magnetic className="rounded-xl px-5 py-2.5 bg-cyan-400 text-black font-medium hover:bg-cyan-300 transition">
//               Launch Demo
//             </Magnetic>
//             <button className="rounded-xl px-5 py-2.5 border border-white/15 hover:bg-white/10 transition">
//               View Docs
//             </button>
//           </div>
//           <div className="mt-10 text-xs text-white/50">
//             © {new Date().getFullYear()} SLAIC Transit • Built with Next.js +
//             GSAP
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }
