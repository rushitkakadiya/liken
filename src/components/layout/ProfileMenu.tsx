import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { User as UserIcon, Heart, LogOut, ChevronDown } from "lucide-react";
import { useUser } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";

export function ProfileMenu() {
  const user = useUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    void logout(() => setOpen(false));
  };

  const initials = (user.name || user.email)
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-white/10 hover:border-white/20 transition"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="h-7 w-7 rounded-full overflow-hidden btn-pink grid place-items-center text-xs font-bold">
          {user.profileImage ? (
            <img src={user.profileImage} alt={`${user.name} profile photo`} className="w-full h-full object-cover" width={28} height={28} loading="lazy" decoding="async" />
          ) : (
            initials
          )}
        </span>
        <ChevronDown size={14} className="text-[#a8a0a3]" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 glass-card p-2 z-50 shadow-xl">
          <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
            <div className="text-sm truncate">{user.name}</div>
            <div className="text-xs text-[#a8a0a3] truncate">{user.email}</div>
          </div>
          <MenuItem to="/profile" icon={<UserIcon size={14} />} label="Profile" onClick={() => setOpen(false)} />
          <MenuItem to="/saved-looks" icon={<Heart size={14} />} label="Saved Looks" onClick={() => setOpen(false)} />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#a8a0a3] hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#cfc7ca] hover:bg-white/[0.04] hover:text-white"
    >
      {icon} {label}
    </Link>
  );
}
