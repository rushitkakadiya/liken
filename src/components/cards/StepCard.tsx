import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StepCard({ step, title, desc, accent, icon }: { step: number; title: string; desc: string; accent?: boolean; icon?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl p-6 h-full flex flex-col ${
        accent
          ? "bg-[#ee296b] text-white pink-glow"
          : "glass-card text-white"
      }`}
    >
      <div className={`text-xs font-medium mb-4 ${accent ? "text-white/80" : "text-[#a8a0a3]"}`}>
        Step {step.toString().padStart(2, "0")}
      </div>
      <div className="mb-3 text-[#ee296b]">{icon}</div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className={`text-xs leading-relaxed ${accent ? "text-white/85" : "text-[#a8a0a3]"}`}>{desc}</p>
    </motion.div>
  );
}
