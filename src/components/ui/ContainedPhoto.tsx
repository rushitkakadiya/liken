/**
 * Full photo visible (no cropping) with a soft blurred fill behind empty edges.
 * Main image uses absolute + object-contain so it always paints and never crops.
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
        className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-[1.25] object-cover opacity-55 blur-2xl"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#1c1618]/20" aria-hidden />
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 z-10 h-full w-full object-contain object-center"
        decoding="async"
      />
    </div>
  );
}
