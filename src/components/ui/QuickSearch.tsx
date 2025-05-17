import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface QuickSearchProps {
  /** Wrapper className */
  className?: string;
  /** Additional className passed to the underlying Input */
  inputClassName?: string;
}

/**
 * Lightweight search box that queries the in-memory patient cache (or Supabase)
 * and surfaces up to 10 matching patients in a floating list. Clicking a result
 * navigates to that patient's workspace at /patients/[id].
 *
 * Future iterations can switch the query source to the dedicated Supabase RPC
 * without changing the component surface.
 */
export default function QuickSearch({ className, inputClassName }: QuickSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query input ~300 ms
  useEffect(() => {
    const handler = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 3) {
        setResults([]);
        return;
      }
      // Ensure data is loaded; noop if already loaded
      try {
        await patientDataService.loadPatientData();
      } catch (_) {
        /* load errors are logged inside the service */
      }
      const lower = q.toLowerCase();
      const matches = patientDataService
        .getAllPatients()
        .filter((p) => (p.name || "").toLowerCase().includes(lower))
        .slice(0, 10);
      setResults(matches);
      setIsOpen(true);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        placeholder="Quick search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={cn("placeholder:text-white/60", inputClassName)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
      />
      {isOpen && (
        <div className="absolute left-0 mt-1 w-full max-h-64 overflow-auto z-50 rounded-md bg-glass backdrop-blur-lg border border-[rgba(255,255,255,0.12)] shadow-card animate-fade-in-down">
          {results.length === 0 && query.trim().length >= 3 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            >
              {p.photo && (
                <img
                  src={p.photo}
                  alt={p.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              <span className="truncate text-left">{p.name || p.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 