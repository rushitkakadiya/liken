import { useState, type ReactNode } from "react";
import { Upload, X } from "lucide-react";

export function UploadCard({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [drag, setDrag] = useState(false);
  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => onChange(r.result as string);
    r.readAsDataURL(f);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
      }}
      className={`relative aspect-[4/3] rounded-3xl border-2 border-dashed transition overflow-hidden ${drag ? "border-[#ee296b] bg-[#ee296b]/5" : "border-white/10 bg-[#181516]"}`}
    >
      {value ? (
        <>
          {/* Soft blur fill (no black bars) + full photo visible */}
          <img
            src={value}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl"
            decoding="async"
          />
          <img
            src={value}
            alt="Uploaded photo preview"
            className="absolute inset-0 z-10 h-full w-full object-contain object-center"
            decoding="async"
          />
          <button
            onClick={() => onChange(null)}
            className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white hover:bg-black/80"
            aria-label="Remove uploaded photo"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <label className="absolute inset-0 grid place-items-center cursor-pointer text-center px-6">
          <div>
            <div className="h-14 w-14 rounded-2xl bg-[#ee296b]/10 text-[#ee296b] grid place-items-center mx-auto mb-4">
              <Upload size={22} />
            </div>
            <div className="text-white font-medium mb-1">Upload your photo</div>
            <div className="text-xs text-[#a8a0a3]">Clear upper-body photo works best</div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      )}
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#a8a0a3] mb-2">{label}</label>
      {children}
    </div>
  );
}

export function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-4 py-2 rounded-full text-sm transition border ${value === o ? "bg-[#ee296b] border-[#ee296b] text-white" : "bg-[#181516] border-white/10 text-[#cfc7ca] hover:border-white/20"}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
