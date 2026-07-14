import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardNavbar } from "@/components/layout/Navbar";
import { useLooks, deleteLookAsync } from "@/lib/auth";
import { OutfitResultCard } from "@/components/cards/OutfitResultCard";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/saved-looks")({
  head: () => pageHead("savedLooks"),
  component: () => <ProtectedRoute><SavedLooks /></ProtectedRoute>,
});

function SavedLooks() {
  const looks = useLooks();
  return (
    <div className="min-h-screen">
      <DashboardNavbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-8">Saved Looks</h1>
        {looks.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <p className="text-[#a8a0a3] text-lg">No saved looks yet. Start styling now.</p>
            <Link to="/studio" className="inline-flex mt-6 px-5 py-2.5 rounded-full btn-pink text-sm">Open Studio</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {looks.map((l) => (
              <OutfitResultCard
                key={l.id}
                look={l}
                onDelete={async () => {
                  try {
                    await deleteLookAsync(l.id);
                    toast.success("Deleted");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to delete look");
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
