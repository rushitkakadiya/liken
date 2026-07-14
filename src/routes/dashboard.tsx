import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Heart, Wand2, ArrowRight } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardNavbar } from "@/components/layout/Navbar";
import { useUser, useLooks, isPremium } from "@/lib/auth";
import { OutfitResultCard } from "@/components/cards/OutfitResultCard";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/dashboard")({
  head: () => pageHead("dashboard"),
  component: () => <ProtectedRoute><DashboardPage /></ProtectedRoute>,
});

function DashboardPage() {
  const user = useUser();
  const looks = useLooks();
  const premium = isPremium(user);
  const recentLooks = looks.slice(0, 3);

  const stats = [
    { label: "Looks generated", value: user?.looksGenerated ?? 0, icon: <Wand2 size={18} /> },
    { label: "Saved looks", value: looks.length, icon: <Heart size={18} /> },
    {
      label: "Current plan",
      value: premium ? "Premium" : "Free",
      icon: <Sparkles size={18} />,
    },
  ];

  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm text-[#a8a0a3]">Welcome back</p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1">{user?.name ?? "Stylist"}</h1>
          </div>
          <Link to="/studio" className="inline-flex items-center gap-2 px-5 py-3 rounded-full btn-pink text-sm font-medium self-start">
            Start Styling <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-6">
              <div className="flex items-center justify-between text-[#a8a0a3] text-sm">
                <span>{s.label}</span>
                <span className="text-[#ee296b]">{s.icon}</span>
              </div>
              <div className="text-3xl font-semibold mt-3">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">Recent saved looks</h2>
          <Link to="/saved-looks" className="text-sm text-[#a8a0a3] hover:text-white">View all →</Link>
        </div>

        {recentLooks.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-[#a8a0a3]">No saved looks yet.</p>
            <Link to="/studio" className="inline-flex mt-4 px-5 py-2.5 rounded-full btn-pink text-sm">Open Studio</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentLooks.map((l) => (
              <OutfitResultCard key={l.id} look={l} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
