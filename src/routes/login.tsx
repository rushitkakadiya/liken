import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useAuthReady, useUser } from "@/lib/auth";
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
          <h1 className="text-2xl font-semibold mb-1 text-center">{title}</h1>
          <p className="text-sm text-[#8f878a] mb-7 text-center">{subtitle}</p>

          <GoogleSignInButton redirectTo={redirectTo} />

          <p className="text-[11px] text-[#8f878a] text-center mt-6 leading-relaxed">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
