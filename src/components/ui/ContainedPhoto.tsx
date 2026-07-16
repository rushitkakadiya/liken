/**
 * Photo frame for try-on / previews.
 * - contain: full image visible
 * - cover: fills the whole frame (product images)
 * - showBlur: soft blurred fill behind empty edges (off for clean user photo)
 */
export function ContainedPhoto({
  src,
  alt,
  className = "",
  tone = "dark",
  fit = "contain",
  showBlur = true,
}: {
  src: string;
  alt: string;
  className?: string;
  tone?: "dark" | "light";
  fit?: "contain" | "cover";
  showBlur?: boolean;
}) {
  const base = tone === "light" ? "bg-[#efeae6]" : "bg-[#241e20]";
  const objectFit = fit === "cover" ? "object-cover" : "object-contain";

  return (
    <div className={`relative h-full w-full overflow-hidden ${base} ${className}`}>
      {showBlur && (
        <>
          <img
            src={src}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <div
            className={`pointer-events-none absolute inset-0 z-[1] ${
              tone === "light" ? "bg-white/20" : "bg-[#1c1618]/20"
            }`}
            aria-hidden
          />
        </>
      )}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 z-10 h-full w-full object-center ${objectFit}`}
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
