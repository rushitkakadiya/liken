import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Palette, Upload, Heart, Wand2, Eye, ArrowRight,
  Shirt, Calendar, ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ImageMarquee } from "@/components/sections/ImageMarquee";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import { StepCard } from "@/components/cards/StepCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { UploadCard, FormField, ChipGroup } from "@/components/cards/UploadCard";
import { OutfitResultCard } from "@/components/cards/OutfitResultCard";
import { ColorAnalysisErrorBanner, ColorAnalysisSummary } from "@/components/cards/ColorAnalysisSummary";
import {
  analyzeStyleFromImage,
  ColorAnalysisError,
  dataUrlToFile,
} from "@/services/colorAnalysisService";
import type { ColorAnalysisResult } from "@/types/colorAnalysis";
import { saveLookAsync, useUser, type Look } from "@/lib/auth";
import { pageHead } from "@/lib/seo/pages";
import {
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  FAQ_ITEMS,
  SITE_NAME,
} from "@/lib/seo/site";

export const Route = createFileRoute("/")({
  head: () => {
    const head = pageHead("home");
    return {
      ...head,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildSoftwareApplicationJsonLd()),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(buildFaqPageJsonLd()),
        },
      ],
    };
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content">
        <Hero />
        <ImageStrip />
        <HowItWorks />
        <Demo />
        <Features />
        <ReviewsSection />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-16 pb-16 px-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#ee296b]/10 blur-[120px] pointer-events-none" />
      <div className="max-w-5xl mx-auto text-center relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-[#a8a0a3] mb-6">
          <Sparkles size={11} className="text-[#ee296b]" /> AI-powered personal stylist
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]"
        >
          Your AI Stylist For<br />Colors That <span className="text-gradient-pink">Actually Suit You</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-[#a8a0a3] max-w-xl mx-auto mt-5 leading-relaxed"
        >
          Upload a photo and get outfit color combinations designed for your skin tone, occasion, and personal style.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-8"
        >
          <Link to="/signup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full btn-pink text-xs font-medium">
            Start Styling Free <ArrowRight size={14} />
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-xs hover:bg-white/[0.04]">
            See How It Works
          </a>
        </motion.div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.7 }}
      className="mt-14 max-w-4xl mx-auto"
    >
      <div className="glass-card p-4 sm:p-6 pink-glow">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-[#2a1f24] to-[#181516] grid place-items-center relative overflow-hidden ring-1 ring-white/5">
            <img
              src="https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=800&q=80"
              className="w-full h-full object-cover opacity-90"
              alt="Example outfit color styling preview"
              width={800}
              height={1000}
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181516] via-transparent to-transparent" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur text-[11px]">Your photo</div>
          </div>

          <div className="flex flex-col gap-3 text-left">
            <div className="glass-card p-4">
              <div className="text-[11px] text-[#a8a0a3] uppercase tracking-wider">Skin tone</div>
              <div className="text-xl font-semibold mt-1">Medium Warm</div>
              <div className="text-[11px] text-[#a8a0a3] mt-1">Warm undertone detected</div>
            </div>

            <div className="glass-card p-4">
              <div className="text-[11px] text-[#a8a0a3] uppercase tracking-wider mb-2">Best colors</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { n: "Blush", c: "#E8B4BC" },
                  { n: "Soft Rose", c: "#D4899A" },
                  { n: "Mauve", c: "#C4A4B8" },
                  { n: "Ivory", c: "#F5EDE4" },
                ].map((c) => (
                  <div key={c.n} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.c }} />
                    {c.n}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4 bg-gradient-to-br from-[#ee296b]/20 to-transparent border-[#ee296b]/30">
              <div className="text-[11px] text-white/80 uppercase tracking-wider">Outfit score</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-gradient-pink">94%</span>
                <span className="text-xs text-[#a8a0a3]">match</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["#E8B4BC", "#D4899A", "#C4A4B8", "#F5EDE4"].map((c, i) => (
                <div key={i} className="aspect-square rounded-xl ring-1 ring-white/10" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ImageStrip() {
  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-6 text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Infinite outfit ideas.<br /><span className="text-[#a8a0a3]">Zero confusion.</span>
        </h2>
      </div>
      <ImageMarquee />
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Upload your photo", desc: "Drop in a clear photo. We instantly read your skin tone and undertone.", icon: <Upload size={24} /> },
    { title: "Choose your occasion", desc: "Casual, office, date night, wedding — tell us where you're headed.", icon: <Calendar size={24} /> },
    { title: "AI suggests colors and outfits", desc: "Get curated top and bottom combinations with match scores.", icon: <Wand2 size={24} /> },
    { title: "Save your best looks", desc: "Build a personal style library you can return to anytime.", icon: <Heart size={24} />, accent: true },
  ];
  return (
    <section id="how" className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How {SITE_NAME} works</h2>
          <p className="text-[#a8a0a3] mt-3 text-sm">Upload once. Discover outfits for every occasion.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <StepCard key={i} step={i + 1} title={s.title} desc={s.desc} icon={s.icon} accent={s.accent} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Demo() {
  const user = useUser();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [gender, setGender] = useState("Men");
  const [occasion, setOccasion] = useState("Casual");
  const [style, setStyle] = useState("Minimal");
  const [mood, setMood] = useState("Natural");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Look[]>([]);
  const [analysis, setAnalysis] = useState<ColorAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!user) {
      toast.error("Sign in to generate outfit colors");
      router.navigate({ to: "/login" });
      return;
    }

    if (!image) {
      setError("Please upload a clear photo of yourself before generating outfit suggestions.");
      toast.error("Upload a photo first");
      return;
    }

    setLoading(true);
    setResults([]);
    setAnalysis(null);
    setError(null);

    try {
      const data = await analyzeStyleFromImage({
        imageFile: dataUrlToFile(image),
        gender,
        occasion,
        stylePreference: style,
        colorMood: mood,
        outfitCount: 3,
      });
      setAnalysis(data);
      setResults(data.outfits);
    } catch (err) {
      const message = err instanceof ColorAnalysisError ? err.message : "Color analysis failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Try it right now</h2>
          <p className="text-[#a8a0a3] mt-3 text-sm">
            {user ? "Upload a photo and get personalized color combinations." : "Sign in to generate outfit colors tailored to you."}
          </p>
        </div>

        <div className="glass-card p-5 sm:p-8">
          <div className="grid lg:grid-cols-2 gap-6">
            <UploadCard value={image} onChange={setImage} />
            <div className="space-y-4">
              <FormField label="Gender preference">
                <ChipGroup options={["Men", "Women", "Unisex"]} value={gender} onChange={setGender} />
              </FormField>
              <FormField label="Occasion">
                <ChipGroup options={["Casual", "Office", "Date Night", "Wedding", "Party", "Interview"]} value={occasion} onChange={setOccasion} />
              </FormField>
              <FormField label="Style preference">
                <ChipGroup options={["Minimal", "Luxury", "Streetwear", "Formal", "Traditional"]} value={style} onChange={setStyle} />
              </FormField>
              <FormField label="Color mood">
                <ChipGroup options={["Dark", "Light", "Natural", "Bold"]} value={mood} onChange={setMood} />
              </FormField>
              <button onClick={generate} disabled={loading || !user} className="w-full px-5 py-3 rounded-full btn-pink text-xs font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {!user ? "Sign in to Generate" : loading ? "Generating…" : (<><Wand2 size={14} /> Generate Outfit Suggestions</>)}
              </button>
              {!user && (
                <p className="text-xs text-[#a8a0a3] text-center">
                  <Link to="/login" className="text-[#ee296b] hover:underline">Sign in</Link> or{" "}
                  <Link to="/signup" className="text-[#ee296b] hover:underline">create an account</Link> to use {SITE_NAME}.
                </p>
              )}
            </div>
          </div>

          {(loading || results.length > 0 || error) && (
            <div className="mt-8">
              {error && !loading && <ColorAnalysisErrorBanner message={error} />}
              {analysis && !loading && <ColorAnalysisSummary analysis={analysis} />}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {loading && [0, 1, 2].map((i) => (
                  <div key={i} className="glass-card p-5 animate-pulse h-72" />
                ))}
                {results.map((r) => (
                  <OutfitResultCard
                    key={r.id}
                    look={r}
                    onSave={async () => {
                      if (!user) {
                        toast.error("Sign in to save looks");
                        router.navigate({ to: "/login" });
                        return;
                      }
                      try {
                        await saveLookAsync(r);
                        toast.success("Look saved");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to save look");
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const f = [
    { icon: <Eye size={18} />, title: "Skin tone analysis", desc: "Instant detection of your complexion for accurate color picks." },
    { icon: <Palette size={18} />, title: "Undertone matching", desc: "Warm, cool or neutral — we tune outfits to your undertone." },
    { icon: <Shirt size={18} />, title: "Outfit color combinations", desc: "Top and bottom colors balanced into one cohesive look." },
    { icon: <Calendar size={18} />, title: "Occasion-based styling", desc: "From office mornings to wedding nights, every event covered." },
    { icon: <Heart size={18} />, title: "Saved looks", desc: "Build a personal lookbook you can revisit anytime." },
    { icon: <Sparkles size={18} />, title: "Future AI try-on", desc: "See yourself in suggested outfits before you commit." },
  ];
  return (
    <section id="features" className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Everything you need to dress better</h2>
          <p className="text-[#a8a0a3] mt-3 text-sm">No clothes for sale. Just smarter, kinder styling.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {f.map((x) => <FeatureCard key={x.title} {...x} />)}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = FAQ_ITEMS;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-3">Frequently asked questions</h2>
        <p className="text-center text-sm text-[#a8a0a3] mb-10 max-w-xl mx-auto">
          Everything you need to know about styling with {SITE_NAME}.
        </p>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between gap-4 p-5 sm:p-6 text-left"
                aria-expanded={open === i}
                aria-controls={`faq-panel-${i}`}
              >
                <span className="text-sm sm:text-[15px] font-medium leading-snug">{it.q}</span>
                <ChevronDown size={16} className={`text-[#a8a0a3] shrink-0 mt-0.5 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div id={`faq-panel-${i}`} className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-[#a8a0a3] leading-relaxed border-t border-white/[0.06] pt-4">
                  {it.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto glass-card p-10 sm:p-14 text-center relative overflow-hidden pink-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ee296b]/10 via-transparent to-transparent" />
        <div className="relative">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ready to dress your color story?</h2>
          <p className="text-[#a8a0a3] mt-3 text-sm">Free to start. No credit card required.</p>
          <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-full btn-pink text-xs font-medium mt-6">
            Start Styling Free <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
