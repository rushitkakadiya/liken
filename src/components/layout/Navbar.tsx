import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useUser } from "@/lib/auth";
import { useLogout } from "@/hooks/use-logout";
import { SITE_ICON_PATH, SITE_NAME } from "@/lib/seo/site";
import { BrandWord } from "./BrandWord";
import { Menu, X, User as UserIcon, Heart, LogOut } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

type NavLink = { label: string; to: string };

function getLinks(loggedIn: boolean): NavLink[] {
  if (loggedIn) {
    return [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Studio", to: "/studio" },
      { label: "Saved Looks", to: "/saved-looks" },
      { label: "Pricing", to: "/pricing" },
    ];
  }
  return [
    { label: "Home", to: "/" },
    { label: "Studio", to: "/studio" },
    { label: "Pricing", to: "/pricing" },
  ];
}

export function Navbar() {
  const user = useUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const links = getLinks(!!user);

  const handleLogout = () => {
    void logout(() => setOpen(false));
  };

  const initials = user
    ? (user.name || user.email).split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-50 bg-[#0e090a]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold" aria-label={`${SITE_NAME} home`}>
          <img
            src={SITE_ICON_PATH}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
            width={28}
            height={28}
          />
          <BrandWord />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-[#a8a0a3]" aria-label="Main navigation">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="hover:text-white transition-colors"
              activeProps={{ className: "text-white" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <ProfileMenu />
          ) : (
            <>
              <Link to="/login" className="text-sm text-[#a8a0a3] hover:text-white transition-colors">Login</Link>
              <Link to="/signup" className="px-5 py-2 rounded-xl btn-pink text-sm font-medium">Start Free</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-white" aria-label="Toggle menu" aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="md:hidden border-t border-white/[0.06] bg-[#0e090a]/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3 text-sm">
            {links.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-[#cfc7ca] hover:text-white py-1">
                {l.label}
              </Link>
            ))}
            {user ? (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 px-1 pb-3">
                  <span className="h-9 w-9 rounded-full overflow-hidden btn-pink grid place-items-center text-xs font-bold">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={`${user.name} profile photo`} className="w-full h-full object-cover" width={36} height={36} loading="lazy" decoding="async" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{user.name}</div>
                    <div className="text-xs text-[#a8a0a3] truncate">{user.email}</div>
                  </div>
                </div>
                <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#cfc7ca] hover:bg-white/[0.04] hover:text-white">
                  <UserIcon size={14} /> Profile
                </Link>
                <Link to="/saved-looks" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#cfc7ca] hover:bg-white/[0.04] hover:text-white">
                  <Heart size={14} /> Saved Looks
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#a8a0a3] hover:bg-white/[0.04] hover:text-white" aria-label="Log out">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                <Link to="/login" onClick={() => setOpen(false)} className="text-center text-[#cfc7ca] py-2">Login</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="px-5 py-2 rounded-xl btn-pink text-center">Start Free</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// Alias kept so existing imports keep working.
export const DashboardNavbar = Navbar;
