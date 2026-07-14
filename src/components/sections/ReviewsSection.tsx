import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { SITE_NAME } from "@/lib/seo/site";

const reviews = [
  {
    name: "Sarah M.",
    role: "Marketing professional",
    text: `I used to buy clothes that looked good online but washed me out. ${SITE_NAME} finally showed me colors that actually suit my skin tone.`,
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80",
    featured: true,
  },
  {
    name: "James K.",
    role: "Software engineer",
    text: "Uploaded one photo and got three outfit color combos for my interview. Simple, fast, and surprisingly accurate.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Priya R.",
    role: "College student",
    text: "The occasion-based suggestions are a game changer. Date night, campus, family events — I always know what colors work.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Elena V.",
    role: "Content creator",
    text: "Love that it focuses on color harmony, not pushing products. Feels like a stylist in my pocket without the pressure to buy.",
    rating: 4,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Marcus T.",
    role: "Entrepreneur",
    text: "Saved looks feature is underrated. I built a small library of go-to combinations and getting dressed is way faster now.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Aisha N.",
    role: "Healthcare worker",
    text: "Didn't expect much from a free tool, but the undertone matching was spot on. My wardrobe choices feel more intentional.",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&q=80",
  },
] as const;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "text-[#ee296b] fill-[#ee296b]" : "text-white/15"}
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  index,
  featured = false,
}: {
  review: (typeof reviews)[number];
  index: number;
  featured?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`group relative flex flex-col h-full rounded-2xl p-5 sm:p-6 overflow-hidden ${
        featured
          ? "bg-gradient-to-br from-[#ee296b]/20 via-[#181516] to-[#181516] border border-[#ee296b]/25 pink-glow"
          : "glass-card hover:border-[#ee296b]/25 transition-colors"
      }`}
    >
      <Quote
        size={featured ? 28 : 22}
        className={`absolute top-4 right-4 pointer-events-none transition-opacity ${
          featured ? "text-[#ee296b]/25" : "text-white/[0.04] group-hover:text-[#ee296b]/15"
        }`}
      />

      <div className="flex items-start gap-3.5 mb-4 relative">
        <div className="relative shrink-0">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full p-[2px] bg-gradient-to-br from-[#ee296b] to-[#ff7aa6]">
            <img
              src={review.avatar}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-full object-cover bg-[#181516]"
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#0e090a] grid place-items-center ring-2 ring-[#0e090a]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ee296b]" />
          </span>
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold truncate">{review.name}</p>
          <p className="text-[11px] text-[#a8a0a3] mt-0.5 truncate">{review.role}</p>
          <div className="mt-2">
            <StarRating rating={review.rating} />
          </div>
        </div>
      </div>

      <p className={`leading-relaxed flex-1 relative ${featured ? "text-sm sm:text-base text-[#f0eaec]" : "text-sm text-[#cfc7ca]"}`}>
        &ldquo;{review.text}&rdquo;
      </p>
    </motion.article>
  );
}

export function ReviewsSection() {
  const featured = reviews.find((r) => r.featured) ?? reviews[0];
  const rest = reviews.filter((r) => r !== featured);

  return (
    <section className="py-16 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#ee296b]/[0.06] blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-[#cfc7ca] mb-5"
          >
            <div className="flex -space-x-2">
              {reviews.slice(0, 4).map((r) => (
                <img
                  key={r.name}
                  src={r.avatar}
                  alt=""
                  className="h-6 w-6 rounded-full ring-2 ring-[#0e090a] object-cover"
                  width={24}
                  height={24}
                  loading="lazy"
                />
              ))}
            </div>
            <span className="flex items-center gap-1">
              <Star size={11} className="text-[#ee296b] fill-[#ee296b]" />
              <span className="font-medium text-white">4.9</span> from early users
            </span>
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What people are saying</h2>
          <p className="text-[#a8a0a3] mt-3 text-sm max-w-lg mx-auto">
            Real styling wins from people using {SITE_NAME} every day.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ReviewCard review={featured} index={0} featured />
          <div className="grid sm:grid-cols-2 gap-4">
            {rest.slice(0, 2).map((review, i) => (
              <ReviewCard key={review.name} review={review} index={i + 1} />
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.slice(2).map((review, i) => (
            <ReviewCard key={review.name} review={review} index={i + 3} />
          ))}
        </div>
      </div>
    </section>
  );
}
