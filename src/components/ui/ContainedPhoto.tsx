/**
 * Full photo visible (no cropping) with a soft blurred fill behind empty edges.
 * Fits the image inside the frame — top-to-bottom and left-to-right.
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
      {/* Soft fill from the same image — removes black empty bars */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.35] object-cover opacity-60 blur-2xl"
        loading="lazy"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-[#1c1618]/25" aria-hidden />

      {/* Entire image fitted inside the box — nothing cropped */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-1.5 sm:p-2">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full h-auto w-auto object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}
