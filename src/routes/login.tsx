import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuthReady, useUser } from "@/lib/auth";
import { getMobileSignInInstructions, isLanDevOrigin, isPublicHttpsOrigin } from "@/lib/appOrigin";
import { pageHead } from "@/lib/seo/pages";
import { SITE_ICON_PATH } from "@/lib/seo/site";
import { BrandWord } from "@/components/layout/BrandWord";

export const Route = createFileRoute("/login")({
  head: () => pageHead("login"),
  component: LoginPage,
});

function LoginPage() {
  return <AuthScreen title="Welcome back" subtitle="Sign in to continue styling." />;
}

export function AuthScreen({
  title,
  subtitle,
  redirectTo = "/dashboard",
}: {
  title: string;
  subtitle: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const ready = useAuthReady();
  const user = useUser();
  const lanDev = isLanDevOrigin();
  const tunnelDev = isPublicHttpsOrigin();
  const mobileHelp = getMobileSignInInstructions();

  useEffect(() => {
    if (ready && user) {
      router.navigate({ to: redirectTo });
    }
  }, [ready, user, router, redirectTo]);

  if (user) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="h-10 w-10 rounded-full border-2 border-[#ee296b] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="h-10 w-10 rounded-full border-2 border-[#ee296b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <main id="main-content" className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold mb-8">
          <img
            src={SITE_ICON_PATH}
            alt=""
            className="h-8 w-8 rounded-lg object-cover"
            width={32}
            height={32}
          />
          <BrandWord />
        </Link>
        <div className="rounded-2xl bg-[#181516] border border-white/[0.08] p-8">
          <h1 className="text-2xl font-semibold mb-1">{title}</h1>
          <p className="text-sm text-[#8f878a] mb-7">{subtitle}</p>

          <GoogleSignInButton redirectTo={redirectTo} />

          {lanDev && (
            <div className="mt-5 rounded-xl border border-[#ee296b]/25 bg-[#ee296b]/5 p-3 text-[11px] leading-relaxed text-[#cfc7ca]">
              <p className="font-medium text-white mb-1">Phone sign-in won&apos;t work on 192.168.x.x</p>
              <p className="mb-3">
                Supabase blocks Google redirects to LAN IPs. After Google &quot;Continue&quot;, it sends you to
                localhost — which fails on your phone. Use one of these instead:
              </p>

              <div className="mb-3">
                <p className="font-medium text-white mb-1">{mobileHelp.iphone.title}</p>
                <ol className="list-decimal list-inside space-y-1">
                  {mobileHelp.iphone.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mb-3">
                <p className="font-medium text-white mb-1">{mobileHelp.androidUsb.title}</p>
                <ol className="list-decimal list-inside space-y-1">
                  {mobileHelp.androidUsb.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="font-medium text-white mb-1">{mobileHelp.tunnel.title}</p>
                <ol className="list-decimal list-inside space-y-1">
                  {mobileHelp.tunnel.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {tunnelDev && (
            <div className="mt-5 rounded-xl border border-green-500/25 bg-green-500/5 p-3 text-[11px] text-[#cfc7ca]">
              Tunnel URL detected — Google sign-in should work on this device.
            </div>
          )}

          <p className="text-[11px] text-[#8f878a] text-center mt-6 leading-relaxed">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
