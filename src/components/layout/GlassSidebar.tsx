"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Home, Users, BarChart3, BellRing, Settings as Cog, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "alerts", label: "Alerts", icon: BellRing },
    { key: "settings", label: "Settings", icon: Cog },
  ];
  return (
    <div className={`min-h-[calc(100svh-4rem)] ${collapsed ? 'w-[4.5rem]' : 'w-56'} bg-glass backdrop-blur-lg border-r border-[rgba(255,255,255,0.12)] shadow-card flex flex-col p-3 hidden lg:flex rounded-tr-card transition-all duration-300 ease-in-out overflow-hidden`}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              aria-label={collapsed ? "Maximize menu" : "Minimize menu"}
              onClick={toggle}
              className={`${collapsed ? 'self-center' : 'self-end'} blurred-circle-bg rounded-full w-8 h-8 flex items-center justify-center mb-4`}
            >
              {collapsed ? (
                <PanelLeftOpen
                  strokeWidth={1.5}
                  className="h-5 w-5 text-purple-500"
                />
              ) : (
                <PanelLeftClose
                  strokeWidth={1.5}
                  className="h-5 w-5 text-purple-500"
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{collapsed ? "Maximize menu" : "Minimize menu"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
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