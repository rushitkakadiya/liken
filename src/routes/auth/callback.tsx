import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { consumeOAuthNext, getMobileSignInInstructions, isMobileLocalhostRedirectTrap } from "@/lib/appOrigin";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/auth/callback")({
  head: () => pageHead("authCallback"),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing Google sign-in…");
  const mobileHelp = getMobileSignInInstructions();

  useEffect(() => {
    let active = true;

    if (isMobileLocalhostRedirectTrap()) {
      const text =
        "Google redirected to localhost:8080 — this always fails on a phone.\n\n" +
        "Why: Supabase blocks redirects to 192.168.x.x LAN URLs and falls back to localhost.\n\n" +
        "Fix (iPhone):\n" +
        mobileHelp.iphone.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      setMessage(text);
      toast.error("Use a trycloudflare.com tunnel on iPhone — not 192.168.x.x");
      return;
    }

    const finish = async () => {
      try {
        await authService.handleAuthCallback();
        if (!active) return;
        const next = consumeOAuthNext("/dashboard");
        toast.success("Signed in with Google");
        router.navigate({ to: next });
      } catch (err) {
        if (!active) return;
        const text = err instanceof Error ? err.message : "Sign-in failed";
        setMessage(text);
        toast.error(text);
        router.navigate({ to: "/login" });
      }
    };

    void finish();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="text-center max-w-lg">
        <div className="h-10 w-10 mx-auto mb-4 rounded-full border-2 border-[#ee296b] border-t-transparent animate-spin" />
        <p className="text-sm text-[#a8a0a3] whitespace-pre-wrap text-left">{message}</p>
      </div>
    </div>
  );
}
