import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Home, Users, BarChart3, BellRing, Settings as Cog } from "lucide-react";

export default function GlassSidebar() {
  const pathname = usePathname();
  const items = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "patients", label: "Patients", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "alerts", label: "Alerts", icon: BellRing },
    { key: "settings", label: "Settings", icon: Cog },
  ];
  return (
    <div className="h-full w-56 bg-glass backdrop-blur-lg border-r border-[rgba(255,255,255,0.12)] shadow-card flex-col p-3 hidden lg:flex rounded-tr-card rounded-br-none">
      {items.map(({ key, label, icon: Icon }) => {
        const href = `/${key === "dashboard" ? "" : key}`;
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-3 mb-1 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-neon/10 text-neon" : "hover:bg-white/10"}`}
          >
            <Icon className="h-[1em] w-[1em]" /> {label}
          </Link>
        );
      })}
      <Separator className="my-4" />
      <Input
        placeholder="Quick search (⌘K)"
        className="text-step--1 h-8 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3"
      />
    </div>
  );
} 