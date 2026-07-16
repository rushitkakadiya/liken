/**
 * Shows the complete image (object-contain — no cropping) with a soft
 * blurred fill behind empty edges so there is never a black letterbox.
 */
export function ContainedPhoto({
  src,
  alt,
  className = "",
  /** Warm light fill suits product shots; dark suits selfies on the studio UI. */
  tone = "dark",
}: {
  src: string;
  alt: string;
  className?: string;
  tone?: "dark" | "light";
}) {
  const base = tone === "light" ? "bg-[#efeae6]" : "bg-[#241e20]";
  const veil = tone === "light" ? "bg-white/25" : "bg-[#1c1618]/20";

  return (
    <div className={`relative h-full w-full overflow-hidden ${base} ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <div className={`pointer-events-none absolute inset-0 z-[1] ${veil}`} aria-hidden />
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 z-10 h-full w-full object-contain object-center"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
