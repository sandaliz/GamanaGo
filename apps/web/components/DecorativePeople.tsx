// apps/web/components/DecorativePeople.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Decorative people around the map with subtle movement.
 * - Pointer-events: none so the map stays fully usable.
 * - Animations: floating/bouncing to make them visible.
 */
export default function DecorativePeople() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {/* Top center */}
      <motion.div
        className="absolute -top-10 left-1/2 -translate-x-1/2 hidden md:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-top.png"
          alt=""
          width={180}
          height={130}
          className="drop-shadow"
          priority
        />
      </motion.div>

      {/* Left side */}
      <motion.div
        className="absolute top-1/3 -left-10 hidden sm:block"
        animate={{ x: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-left.png"
          alt=""
          width={140}
          height={140}
          className="drop-shadow"
        />
      </motion.div>

      {/* Right side */}
      <motion.div
        className="absolute bottom-14 -right-10 hidden md:block"
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-right.png"
          alt=""
          width={160}
          height={160}
          className="drop-shadow"
        />
      </motion.div>

      {/* Bottom center */}
      <motion.div
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 hidden sm:block"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/illustrations/person-bottom.png"
          alt=""
          width={130}
          height={100}
          className="opacity-90"
        />
      </motion.div>
    </div>
  );
}
