import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo/pages";
import { SITE_NAME } from "@/lib/seo/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/terms")({
  head: () => pageHead("terms"),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-xs text-[#a8a0a3] hover:text-white">
            ← Back to {SITE_NAME}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-4">Terms of Service</h1>
          <p className="text-sm text-[#a8a0a3] mt-2">Last updated: July 18, 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#cfc7ca]">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">1. Agreement</h2>
              <p>
                By creating an account, signing in, or using {SITE_NAME}, you agree to these Terms of Service
                and our Privacy Policy. If you do not agree, please do not use the service.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#ee296b]/30 bg-[#ee296b]/5 p-5">
              <h2 className="text-lg font-semibold text-white">2. Subscriptions are non-cancellable</h2>
              <p>
                Premium subscriptions and paid plans on {SITE_NAME} are{" "}
                <strong className="text-white">non-cancellable</strong> after purchase for the billed period.
                Once payment is completed, you cannot cancel, refund, or reverse that subscription period.
                Please confirm your plan carefully before upgrading.
              </p>
              <p>
                Access continues until the end of the paid period according to the plan you selected. We do not
                offer mid-cycle cancellations or prorated refunds unless required by applicable law.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">3. AI results are not guaranteed</h2>
              <p>
                {SITE_NAME} uses artificial intelligence for color analysis, product suggestions, and virtual
                try-on previews.{" "}
                <strong className="text-white">
                  We do not guarantee perfect, exact, or photorealistic results.
                </strong>{" "}
                Generated images, color matches, and outfit recommendations are estimates and may differ from
                real-world clothing, lighting, body fit, fabric texture, or camera quality.
              </p>
              <p>
                You should not rely on AI try-on previews as a substitute for trying garments in person or
                checking merchant sizing and return policies before buying.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">4. What {SITE_NAME} provides</h2>
              <p>
                {SITE_NAME} is a styling tool. We help you explore colors and outfits based on your photo and
                preferences. We do not sell clothing, and third-party product links may lead to external stores
                we do not control.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">5. Accounts and acceptable use</h2>
              <p>
                You are responsible for activity under your account. Do not misuse the service, attempt to disrupt
                it, upload unlawful content, reverse engineer our systems, or use automated scraping beyond normal
                personal use.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">6. Photos and content you upload</h2>
              <p>
                You must only upload photos you have the right to use. Do not upload images of others without
                permission. We may process uploads to provide styling features and improve reliability and safety.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">7. Third-party services</h2>
              <p>
                {SITE_NAME} may use third-party providers for authentication, payments, AI generation, and product
                search. Their terms and availability can affect our service. We are not responsible for merchant
                pricing, stock, shipping, or product accuracy on external sites.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">8. Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, {SITE_NAME} and its operators are not liable for
                indirect, incidental, special, or consequential damages, including purchases made after using our
                suggestions or try-on previews. The service is provided &quot;as is&quot; without warranties of
                uninterrupted or error-free operation.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">9. Changes</h2>
              <p>
                We may update these Terms from time to time. Continued use of {SITE_NAME} after changes means you
                accept the updated Terms. Material updates will be reflected by the &quot;Last updated&quot; date
                above.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">10. Contact</h2>
              <p>
                Questions about these Terms can be sent through the contact options published on {SITE_NAME}.
                Also review our{" "}
                <Link to="/privacy" className="text-[#ee296b] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
