"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House as Home, Users, BellRinging as BellRing, ArrowSquareLeft as PanelLeftClose, ArrowSquareRight as PanelLeftOpen, Lightning as Zap } from '@phosphor-icons/react';
import React, { useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIDEBAR_EXPANDED_WIDTH_REM = 14;
const SIDEBAR_COLLAPSED_WIDTH_REM = 4.5;

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

  useEffect(() => {
    const root = document.documentElement;
    const lgMediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateSidebarStyling = () => {
      if (lgMediaQuery.matches) {
        const currentSidebarWidth = collapsed
          ? `${SIDEBAR_COLLAPSED_WIDTH_REM}rem`
          : `${SIDEBAR_EXPANDED_WIDTH_REM}rem`;
        root.style.setProperty("--actual-sidebar-width", currentSidebarWidth);
        root.classList.remove("no-lg-sidebar");
        root.classList.toggle("lg-sidebar-collapsed", collapsed);
        root.classList.toggle("lg-sidebar-expanded", !collapsed);
      } else {
        root.style.setProperty("--actual-sidebar-width", "0rem");
        root.classList.add("no-lg-sidebar");
        root.classList.remove("lg-sidebar-collapsed", "lg-sidebar-expanded");
      }
    };

    updateSidebarStyling();

    lgMediaQuery.addEventListener("change", updateSidebarStyling);

    return () => {
      lgMediaQuery.removeEventListener("change", updateSidebarStyling);
    };
  }, [collapsed]);

  const items = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "patients", label: "Patients", icon: Users },
    { key: "alerts", label: "Alerts", icon: BellRing },
  ];
  return (
    <div className={`min-h-[calc(100svh-4rem)] ${collapsed ? 'w-[4.5rem]' : 'w-56'} backdrop-blur-none bg-transparent border-r border-[rgba(255,255,255,0.084)] flex flex-col pt-6 pb-3 px-3 hidden lg:flex transition-all duration-300 ease-in-out overflow-hidden`}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Maximize menu" : "Minimize menu"}
              onClick={toggle}
              className={`sidebar-button-bg rounded-full w-8 h-8 mb-4 ${collapsed ? 'self-center' : 'self-start ml-1'} hover:bg-white/20`}
            >
              {collapsed ? (
                <PanelLeftOpen strokeWidth={1.5} className="h-5 w-5 text-white/50" />
              ) : (
                <PanelLeftClose strokeWidth={1.5} className="h-5 w-5 text-white/50" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{collapsed ? "Maximize menu" : "Minimize menu"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {(() => {
        const isAdvisorActive = pathname.startsWith("/advisor");
        return (
          <Link
            href="/advisor"
            aria-label="Open Advisor chat"
            className={`flex items-center h-10 ${collapsed ? 'justify-center' : 'gap-3'} mb-1 rounded-md px-3 py-2 transition-colors ${isAdvisorActive ? 'bg-neon/40 text-text font-semibold' : 'hover:bg-white/10'}`}
            title={collapsed ? 'Advisor' : undefined}
          >
            <Zap
              strokeWidth={1.5}
              className={cn(
                "h-[1.125em] w-[1.125em] flex-shrink-0 filter drop-shadow-sm",
                isAdvisorActive ? "text-black" : "text-yellow-300"
              )}
            />
            {!collapsed && (
              <span
                className={cn(
                  'truncate filter drop-shadow-md',
                  isAdvisorActive
                    ? 'text-black font-semibold'
                    : 'bg-gradient-to-br from-black to-teal-300 bg-clip-text text-transparent sheen'
                )}
              >
                Advisor
              </span>
            )}
          </Link>
        );
      })()}
      {items.map(({ key, label, icon: Icon }) => {
        const href = `/${key === "dashboard" ? "" : key}`;
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href}
            className={`flex items-center h-10 ${collapsed ? 'justify-center' : 'gap-3'} mb-1 rounded-md px-3 py-2 transition-colors ${isActive ? "bg-neon/40 text-text font-semibold" : "hover:bg-white/10"}`}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[1.125em] w-[1.125em] flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}