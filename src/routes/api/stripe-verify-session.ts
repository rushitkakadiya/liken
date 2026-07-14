import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyCheckoutSessionForUser } from "@/lib/api/stripe.server";
import { verifyAuthenticatedUser } from "@/lib/supabase.server";
import { getSupabaseServiceClient } from "@/lib/supabaseService.server";

const requestSchema = z.object({
  sessionId: z.string().min(1),
});

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export const Route = createFileRoute("/api/stripe-verify-session")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        const token = getBearerToken(request);
        const auth = await verifyAuthenticatedUser(token);
        if (!auth.ok) {
          return Response.json(
            { ok: false, error: "UNAUTHORIZED", message: "Please sign in again." },
            { status: 401 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "INVALID_REQUEST", message: "Invalid request body." },
            { status: 400 },
          );
        }

        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "INVALID_REQUEST", message: "sessionId is required." },
            { status: 400 },
          );
        }

        try {
          const verified = await verifyCheckoutSessionForUser(parsed.data.sessionId, auth.userId);
          if (!verified.ok) {
            const message =
              verified.error === "SESSION_MISMATCH"
                ? "This payment session does not belong to your account."
                : verified.error === "MISSING_SUBSCRIPTION"
                  ? "Stripe did not return subscription details yet. Please wait and refresh."
                  : "Payment is not complete yet. Please wait a moment and refresh.";

            return Response.json(
              {
                ok: false,
                error: verified.error,
                message,
              },
              { status: 409 },
            );
          }

          const supabase = getSupabaseServiceClient();
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", auth.userId)
            .maybeSingle();

          if (error || !profile) {
            return Response.json(
              { ok: false, error: "PROFILE_NOT_FOUND", message: "Could not load your profile." },
              { status: 404 },
            );
          }

          return Response.json({ ok: true, profile });
        } catch (error) {
          console.error("[stripe-verify-session]", error);
          const detail = error instanceof Error ? error.message : "Unknown error";
          return Response.json(
            {
              ok: false,
              error: "VERIFY_FAILED",
              message: `Could not verify your payment session. ${detail}`,
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
