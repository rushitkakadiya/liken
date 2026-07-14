const images = [
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
  "https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2lybCUyMGZhc2hpb258ZW58MHx8MHx8fDA%3D",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
  "https://images.unsplash.com/photo-1485518882345-15568b007407?w=600&q=80",
  "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
];

export function ImageMarquee() {
  const all = [...images, ...images];
  return (
    <div className="overflow-hidden relative" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
      <div className="flex gap-4 animate-marquee" style={{ width: "max-content" }}>
        {all.map((src, i) => (
          <div key={i} className="w-[220px] h-[300px] rounded-2xl overflow-hidden relative shrink-0 ring-1 ring-white/10">
            <img src={src} alt="Fashion outfit inspiration photograph" loading="lazy" decoding="async" width={220} height={300} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e090a]/60 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}
