// @ts-types="npm:@supabase/functions-js@2.4.4/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Placeholder edge function for product recommendations.
 * The app uses the TanStack Start route at /api/product-recommendations in development/production.
 * Deploy this function when moving product fetching fully to Supabase Edge Functions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "FETCH_FAILED",
      message: "Use the liken /api/product-recommendations server route.",
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
