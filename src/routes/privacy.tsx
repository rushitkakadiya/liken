import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo/pages";
import { SITE_NAME } from "@/lib/seo/site";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead("privacy"),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-xs text-[#a8a0a3] hover:text-white">
            ← Back to {SITE_NAME}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-4">Privacy Policy</h1>
          <p className="text-sm text-[#a8a0a3] mt-2">Last updated: July 18, 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-[#cfc7ca]">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">1. Overview</h2>
              <p>
                This Privacy Policy explains how {SITE_NAME} collects, uses, and shares information when you use
                our website and styling features.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">2. Information we collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Account details from sign-in providers (such as name, email, and profile image).</li>
                <li>Styling preferences you set (gender preference, style, color mood, country).</li>
                <li>Photos you upload for color analysis or virtual try-on.</li>
                <li>Usage data such as looks generated, product suggestions, and try-on counts.</li>
                <li>Payment and subscription status processed by our payment provider.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">3. How we use information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide color analysis, outfit suggestions, product recommendations, and try-on previews.</li>
                <li>To manage accounts, Premium access, and usage limits.</li>
                <li>To improve reliability, safety, and product quality.</li>
                <li>To communicate important service or billing updates when needed.</li>
              </ul>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold text-white">4. AI processing notice</h2>
              <p>
                Uploaded photos and related inputs may be processed by AI providers to generate styling results.
                AI outputs are approximate and not a guarantee of perfect color matching or try-on accuracy. See
                our{" "}
                <Link to="/terms" className="text-[#ee296b] hover:underline">
                  Terms of Service
                </Link>{" "}
                for subscription and AI result policies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">5. Sharing</h2>
              <p>
                We share data with service providers only as needed to run {SITE_NAME}, including authentication,
                hosting, payments, AI generation, and product search. We do not sell your personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">6. Retention</h2>
              <p>
                We keep account and usage information while your account is active and as needed for billing,
                security, and legal obligations. Session photos used for styling may be processed temporarily to
                deliver results.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">7. Security</h2>
              <p>
                We use reasonable technical and organizational measures to protect information. No method of
                transmission or storage is completely secure, so please use a strong account provider and avoid
                uploading sensitive images you would not want processed.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">8. Your choices</h2>
              <p>
                You may update profile preferences in the app. Depending on your region, you may have rights to
                access, correct, or delete personal data. Contact us through the channels listed on {SITE_NAME}
                to make a request.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">9. Children</h2>
              <p>
                {SITE_NAME} is not directed to children under 13 (or the minimum age required in your country).
                Do not use the service if you are below that age.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">10. Changes</h2>
              <p>
                We may update this Privacy Policy periodically. The &quot;Last updated&quot; date shows the latest
                revision. Continued use means you accept the updated policy.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
