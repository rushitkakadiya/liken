import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="glass-card p-5 hover:border-[#ee296b]/30 transition group"
    >
      <div className="h-9 w-9 rounded-xl bg-[#ee296b]/10 text-[#ee296b] grid place-items-center mb-4 group-hover:bg-[#ee296b] group-hover:text-white transition">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-xs text-[#a8a0a3] leading-relaxed">{desc}</p>
    </motion.div>
  );
}
