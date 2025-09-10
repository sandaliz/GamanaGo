// apps/web/components/DecorativePeopleOutside.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Decorative people placed AROUND the map (not over it).
 * - Top row: one on left, one on right
 * - Bottom: a tiny group centered
 * - Subtle motion so they feel alive
 * - pointer-events-none so they never block clicks
 */
export default function DecorativePeopleOutside() {
  return (
    <div className="select-none pointer-events-none">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="drop-shadow"
        >
          <Image
            src="/illustrations/person-left.png"
            alt=""
            width={170}
            height={170}
            priority
          />
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="drop-shadow"
        >
          <Image
            src="/illustrations/person-right.png"
            alt=""
            width={190}
            height={190}
            priority
          />
        </motion.div>
      </div>

      {/* Bottom small group */}
      <div className="flex items-center justify-center mt-3">
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="opacity-95 drop-shadow"
        >
          <Image
            src="/illustrations/person-bottom.png"
            alt=""
            width={140}
            height={110}
          />
        </motion.div>
      </div>
    </div>
  );
}
