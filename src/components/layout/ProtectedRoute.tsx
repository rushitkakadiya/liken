import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useAuthReady, useUser } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ready = useAuthReady();
  const user = useUser();

  useEffect(() => {
    if (ready && !user) router.navigate({ to: "/login" });
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#ee296b] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
