/**
 * Shows the full photo (object-contain) with a soft blurred fill behind it
 * so portrait/landscape images don't leave awkward black empty bars.
 */
export function ContainedPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#2a2224] ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-2xl"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[#1a1416]/35" aria-hidden />
      <img
        src={src}
        alt={alt}
        className="relative z-10 h-full w-full object-contain object-center"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
