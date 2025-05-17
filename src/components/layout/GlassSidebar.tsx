"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Home, Users, BellRing, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function GlassSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fs_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggle = () => {
    setCollapsed((c) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("fs_sidebar_collapsed", (!c).toString());
      }
      return !c;
    });
  };

  const items = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "patients", label: "Patients", icon: Users },
    { key: "alerts", label: "Alerts", icon: BellRing },
  ];
  return (
    <div className={`min-h-[calc(100svh-4rem)] ${collapsed ? 'w-[4.5rem]' : 'w-56'} bg-glass backdrop-blur-lg border-r border-[rgba(255,255,255,0.12)] shadow-card flex flex-col p-3 hidden lg:flex rounded-tr-card transition-all duration-300 ease-in-out overflow-hidden`}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={collapsed ? "Maximize menu" : "Minimize menu"}
              onClick={toggle}
              className={`${collapsed ? 'self-center' : 'self-end'} sidebar-button-bg rounded-full w-8 h-8 flex items-center justify-center mb-4`}
            >
              {collapsed ? (
                <PanelLeftOpen strokeWidth={1.5} className="h-5 w-5 text-purple-500" />
              ) : (
                <PanelLeftClose strokeWidth={1.5} className="h-5 w-5 text-purple-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{collapsed ? "Maximize menu" : "Minimize menu"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <Link
        href="/advisor"
        aria-label="Open Advisor chat"
        className={cn(
          "group relative flex items-center gap-3 h-12 w-full px-3 rounded-xl",
          "bg-gradient-to-br from-teal-300/25 via-cyan-300/20 to-violet-300/25",
          "border border-white/20 backdrop-blur-lg",
          "shadow-[inset_0_0_2px_rgba(255,255,255,0.35)] transition-all duration-150",
          pathname.startsWith("/advisor")
            ? "ring-2 ring-teal-300/60 shadow-md brightness-110"
            : "hover:brightness-110 hover:scale-[1.05]"
        )}
      >
        <Image
          src="/foresight-icon.png"
          alt="Advisor"
          width={24}
          height={24}
          className="drop-shadow-[0_0_4px_rgba(173,216,230,0.9)]"
        />
        {!collapsed && (
          <span
            className={cn(
              "font-semibold text-sm bg-gradient-to-r from-white via-sky-100 to-white bg-clip-text text-transparent",
              !pathname.startsWith("/advisor") && "sheen"
            )}
          >
            Advisor
          </span>
        )}
      </Link>
      {items.map(({ key, label, icon: Icon }) => {
        const href = `/${key === "dashboard" ? "" : key}`;
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center h-10 ${collapsed ? 'justify-center' : 'gap-3'} mb-1 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-neon/10 text-neon font-semibold" : "hover:bg-white/10"}`}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[1.125em] w-[1.125em] flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
      <Separator className="my-4" />
      {!collapsed && (
      <Input
        placeholder="Quick search (⌘K)"
        className="text-step--1 h-8 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3"
      />)}
    </div>
  );
}