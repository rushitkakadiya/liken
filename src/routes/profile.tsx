import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardNavbar } from "@/components/layout/Navbar";
import { useUser, updateUserAsync, useLooks, isPremium } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { PREMIUM_MONTHLY_LIMIT } from "@/types/database";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/profile")({
  head: () => pageHead("profile"),
  component: () => <ProtectedRoute><Profile /></ProtectedRoute>,
});

function Profile() {
  const user = useUser();
  const looks = useLooks();
  const premium = isPremium(user);

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [gender, setGender] = useState("");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setCountryCode(user.countryCode ?? "");
    setGender(user.genderPref ?? "Unisex");
    setStyle(user.stylePref ?? "Minimal");
    setMood(user.moodPref ?? "Natural");
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#ee296b] border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = (user.name || user.email)
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const save = async () => {
    const c = COUNTRIES.find((x) => x.code === countryCode);
    setSaving(true);
    try {
      await updateUserAsync({
        name,
        countryCode: c?.code,
        countryName: c?.name,
        genderPref: gender,
        stylePref: style,
        moodPref: mood,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const premiumEnds = user.premiumExpiresAt
    ? new Date(user.premiumExpiresAt).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Profile</h1>

        <div className="grid md:grid-cols-3 gap-5 mb-6">
          <div className="glass-card p-6 md:col-span-1 flex flex-col items-center text-center">
            <div className="h-28 w-28 rounded-full overflow-hidden btn-pink grid place-items-center text-2xl font-semibold">
              {user.profileImage ? (
                <img src={user.profileImage} alt={`${user.name} profile photo`} className="w-full h-full object-cover" width={96} height={96} loading="lazy" decoding="async" />
              ) : (
                initials
              )}
            </div>
            <div className="mt-4 text-lg font-semibold">{user.name}</div>
            <div className="text-xs text-[#a8a0a3]">{user.email}</div>
            <p className="text-[11px] text-[#a8a0a3] mt-3 leading-relaxed">
              Profile photo is synced from your Google account.
            </p>
          </div>

          <div className="glass-card p-6 md:col-span-2 grid grid-cols-2 gap-4">
            <Stat
              label="Current Plan"
              value={premium ? "Premium" : "Free"}
              accent
            />
            <Stat
              label={premium ? "Premium until" : "Color generations"}
              value={premium ? (premiumEnds ?? "—") : "Unlimited"}
            />
            <Stat label="Looks Generated" value={String(user.looksGenerated ?? 0)} />
            <Stat label="Saved Looks" value={String(looks.length)} />
            {premium && (
              <>
                <Stat
                  label="Product suggestions left"
                  value={`${PREMIUM_MONTHLY_LIMIT - (user.productSuggestionsUsed ?? 0)} / ${PREMIUM_MONTHLY_LIMIT}`}
                />
                <Stat
                  label="Try-ons left"
                  value={`${PREMIUM_MONTHLY_LIMIT - (user.tryOnsUsed ?? 0)} / ${PREMIUM_MONTHLY_LIMIT}`}
                />
              </>
            )}
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <Row label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Row>
          <Row label="Email">
            <div className={`${inputCls} text-[#a8a0a3] cursor-not-allowed`}>{user.email}</div>
          </Row>
          <Row label="Country">
            <CountrySelect value={countryCode} onChange={setCountryCode} />
          </Row>
          <Row label="Gender preference">
            <Chips options={["Men", "Women", "Unisex"]} value={gender} onChange={setGender} />
          </Row>
          <Row label="Style preference">
            <Chips options={["Minimal", "Luxury", "Streetwear", "Formal", "Traditional"]} value={style} onChange={setStyle} />
          </Row>
          <Row label="Color mood">
            <Chips options={["Dark", "Light", "Natural", "Bold"]} value={mood} onChange={setMood} />
          </Row>

          <button onClick={save} disabled={saving} className="px-5 py-3 rounded-xl btn-pink text-sm font-medium disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

const inputCls = "w-full mt-1.5 px-4 py-3 rounded-xl bg-[#0e090a] border border-white/10 focus:border-[#ee296b] outline-none text-sm";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-[#a8a0a3]">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[#a8a0a3]">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-[#ee296b]" : ""}`}>{value}</div>
    </div>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-4 py-2 rounded-full text-sm transition border ${
            value === o
              ? "bg-[#ee296b] border-[#ee296b] text-white"
              : "bg-[#181516] border-white/10 text-[#cfc7ca] hover:border-white/20"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
