import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { consumeOAuthNext, isMobileLocalhostRedirectTrap } from "@/lib/appOrigin";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/auth/callback")({
  head: () => pageHead("authCallback"),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing Google sign-in…");

  useEffect(() => {
    let active = true;

    if (isMobileLocalhostRedirectTrap()) {
      const text =
        "Google redirected to localhost, which does not work on a phone.\n\n" +
        "In Supabase → Authentication → URL Configuration, set Site URL to your live site " +
        "(e.g. https://your-app.vercel.app) and add that domain under Redirect URLs.";
      setMessage(text);
      toast.error("OAuth redirected to localhost — update Supabase Site URL / Redirect URLs");
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
