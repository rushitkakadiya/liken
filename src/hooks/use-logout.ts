import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { initAuth } from "@/lib/auth";

export function useLogout() {
  const router = useRouter();

  return async (onDone?: () => void) => {
    try {
      await authService.signOut();
      onDone?.();
      await router.navigate({ to: "/login" });
      void initAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logout failed");
    }
  };
}
