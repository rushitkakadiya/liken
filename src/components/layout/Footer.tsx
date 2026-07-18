import { Link } from "@tanstack/react-router";
import { BrandWord } from "./BrandWord";
import { SITE_ICON_PATH, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

const footerLinks = [
  { label: "Studio", to: "/studio" as const },
  { label: "Pricing", to: "/pricing" as const },
  { label: "Terms", to: "/terms" as const },
  { label: "Privacy", to: "/privacy" as const },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-16">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <img
                src={SITE_ICON_PATH}
                alt=""
                className="h-6 w-6 rounded-md object-cover shrink-0"
                width={24}
                height={24}
              />
              <BrandWord />
            </div>
            <p className="text-[#a8a0a3] text-xs mt-1.5">{SITE_TAGLINE}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#a8a0a3]" aria-label="Footer navigation">
            {footerLinks.map((link) =>
              "to" in link ? (
                <Link key={link.label} to={link.to} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <p className="text-[11px] text-[#8f878a] mt-5 pt-4 border-t border-white/[0.06] text-center sm:text-left">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
