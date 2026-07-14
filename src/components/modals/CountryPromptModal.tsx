import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { useUser, updateUserAsync } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { CountrySelect } from "@/components/ui/CountrySelect";

export function CountryPromptModal() {
  const router = useRouter();
  const user = useUser();
  const [code, setCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const open = mounted && !!user && !user.countryCode;

  const save = async () => {
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) {
      toast.error("Please select your country");
      return;
    }
    setSaving(true);
    try {
      await updateUserAsync({ countryCode: c.code, countryName: c.name });
      toast.success(`Country set to ${c.name}`);
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save country");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center px-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-md p-8 rounded-2xl bg-[#181516] border border-white/[0.08] pink-glow"
          >
            <div className="h-12 w-12 rounded-xl bg-[#ee296b]/15 text-[#ee296b] grid place-items-center mb-5">
              <Globe size={20} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Select your country</h2>
            <p className="text-sm text-[#8f878a] mb-6">
              We use your country to recommend products available in your region.
            </p>

            <label className="text-xs uppercase tracking-wider text-[#8f878a]">Country</label>
            <CountrySelect value={code} onChange={setCode} />

            <button
              onClick={save}
              disabled={!code || saving}
              className="w-full mt-6 py-3 rounded-xl btn-pink text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
