// apps/web/components/DecorativePeople.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Decorative people positioned OUTSIDE the map card so they’re clearly visible.
 * - Requires parent wrapper to be `relative` (done in the page).
 * - Uses negative offsets and overflow-visible to avoid covering the map.
 * - pointer-events-none so the map remains fully interactive.
 */
export default function DecorativePeople() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-16 md:-inset-20 lg:-inset-24 overflow-visible z-20"
    >
      {/* Top-left */}
      <motion.div
        className="absolute -top-6 -left-4 sm:-top-10 sm:-left-10"
        initial={{ rotate: -2 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-left.png"
          alt=""
          width={150}
          height={150}
          className="drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]"
          priority
        />
      </motion.div>

      {/* Top-right */}
      <motion.div
        className="absolute -top-8 right-0 sm:-top-12 sm:-right-8"
        initial={{ rotate: 3 }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      >
        <Image
          src="/illustrations/person-top.png"
          alt=""
          width={190}
          height={140}
          className="drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]"
        />
      </motion.div>

      {/* Bottom-left */}
      <motion.div
        className="absolute -bottom-10 -left-2 sm:-bottom-12 sm:-left-8"
        initial={{ rotate: -1 }}
        animate={{ x: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
      >
        <Image
          src="/illustrations/person-bottom.png"
          alt=""
          width={150}
          height={115}
          className="opacity-95 drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]"
        />
      </motion.div>

      {/* Bottom-right */}
      <motion.div
        className="absolute -bottom-8 -right-6 sm:-bottom-12 sm:-right-10"
        initial={{ rotate: 1 }}
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-right.png"
          alt=""
          width={180}
          height={180}
          className="drop-shadow-[0_6px_30px_rgba(0,0,0,0.35)]"
        />
      </motion.div>
    </div>
  );
}
