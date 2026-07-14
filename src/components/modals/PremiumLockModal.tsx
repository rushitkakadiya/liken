import { Link } from "@tanstack/react-router";
import { Lock, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PremiumLockModal({
  open,
  onClose,
  message = "Upgrade to access shopping suggestions and AI try-on.",
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-md p-8 relative pink-glow"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-[#a8a0a3] hover:text-white">
              <X size={18} />
            </button>
            <div className="h-12 w-12 rounded-2xl bg-[#ee296b]/15 text-[#ee296b] grid place-items-center mb-5">
              <Lock size={20} />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Unlock Premium</h2>
            <p className="text-sm text-[#a8a0a3] mb-6">
              {message}
            </p>
            <ul className="space-y-3 mb-7">
              {[
                "Unlimited color generations",
                "15 product suggestions / month",
                "15 AI try-ons / month",
                "Country shopping links — $10/mo",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-[#cfc7ca]">
                  <Check size={16} className="text-[#ee296b] mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
            <Link to="/pricing" onClick={onClose} className="block w-full text-center py-3 rounded-full btn-pink text-sm font-medium">
              Upgrade to Premium
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
