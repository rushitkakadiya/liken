import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select your country",
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const selected = COUNTRIES.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full mt-1.5 flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-[#181516] border border-white/10 hover:border-white/20 focus:border-[#ee296b] outline-none text-sm text-[#f5f5f5] transition"
      >
        <span className="inline-flex items-center gap-2 truncate">
          <Globe size={14} className="text-[#a8a0a3]" />
          {selected ? (
            <span className="truncate">
              {selected.name} <span className="text-[#a8a0a3]">({selected.code})</span>
            </span>
          ) : (
            <span className="text-[#8f878a]">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={16} className={`text-[#a8a0a3] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl bg-[#181516] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0e090a] border border-white/10">
              <Search size={14} className="text-[#a8a0a3]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                className="w-full bg-transparent outline-none text-sm text-[#f5f5f5] placeholder:text-[#8f878a]"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-[#8f878a]">No countries found</li>
            )}
            {filtered.map((c) => {
              const active = c.code === value;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition ${
                      active ? "bg-[#ee296b]/10 text-white" : "text-[#cfc7ca] hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className="truncate">
                      {c.name} <span className="text-[#8f878a]">({c.code})</span>
                    </span>
                    {active && <Check size={14} className="text-[#ee296b]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

