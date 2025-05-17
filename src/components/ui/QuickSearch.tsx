import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Diagnosis, Treatment } from "@/lib/types";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type MatchKind =
  | "name"
  | "reason"
  | "diagnosis"
  | "treatment"
  | "lab";

interface SearchResult {
  patient: Patient;
  snippet?: string; // undefined for name matches
  kind: MatchKind;
  admissionId?: string; // Needed for consult-specific navigation (future)
}

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
  const [results, setResults] = useState<SearchResult[]>([]);
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
      const matches: SearchResult[] = [];

      const allPatients = patientDataService.getAllPatients();

      const addIfNotExceeded = (res: SearchResult) => {
        if (matches.length < 10) matches.push(res);
      };

      const buildSnippet = (raw: string): string => {
        const words = raw.split(/\s+/);
        const idx = words.findIndex((w) => w.toLowerCase().includes(lower));
        if (idx === -1) return raw.slice(0, 50); // fallback
        const start = Math.max(0, idx - 2);
        const end = Math.min(words.length, idx + 3);
        return words.slice(start, end).join(" ");
      };

      allPatients.forEach((p) => {
        if (matches.length >= 10) return;

        const fullName = (p.name || "").toLowerCase();
        const first = (p.firstName || "").toLowerCase();
        const last = (p.lastName || "").toLowerCase();

        // 1) Name match – highest priority, show only once per patient.
        if (
          fullName.includes(lower) ||
          first.includes(lower) ||
          last.includes(lower)
        ) {
          addIfNotExceeded({ patient: p, kind: "name" });
          return; // Skip deeper search to avoid duplicate entries.
        }

        // 2) Patient-level diagnosis fields
        const patientDiagFields = [p.primaryDiagnosis, p.diagnosis];
        for (const field of patientDiagFields) {
          if (field && field.toLowerCase().includes(lower)) {
            addIfNotExceeded({
              patient: p,
              kind: "diagnosis",
              snippet: buildSnippet(field),
            });
            break;
          }
        }

        if (matches.length >= 10) return;

        // 3) Deep search in admissions / diagnoses / treatments.
        const admissions = patientDataService.getPatientAdmissions(p.id);
        for (const ad of admissions) {
          if (matches.length >= 10) break;

          // Reason (Consultation tab)
          if (ad.reason && ad.reason.toLowerCase().includes(lower)) {
            addIfNotExceeded({
              patient: p,
              kind: "reason",
              admissionId: ad.id,
              snippet: buildSnippet(ad.reason),
            });
          }

          // Diagnoses (Diagnosis tab)
          const key = `${p.id}_${ad.id}`;
          const diagMap = (patientDataService as any).allDiagnosesByAdmission;
          const diagnoses: Diagnosis[] = diagMap ? diagMap[key] || [] : [];
          for (const dx of diagnoses) {
            if (dx.description && dx.description.toLowerCase().includes(lower)) {
              addIfNotExceeded({
                patient: p,
                kind: "diagnosis",
                admissionId: ad.id,
                snippet: buildSnippet(dx.description),
              });
              break;
            }
          }

          // Treatments (Treatment tab)
          const treatments: Treatment[] = ad.treatments || [];
          for (const t of treatments) {
            if (t.drug && t.drug.toLowerCase().includes(lower)) {
              addIfNotExceeded({
                patient: p,
                kind: "treatment",
                admissionId: ad.id,
                snippet: buildSnippet(t.drug),
              });
              break;
            }
          }
        }
      });

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

  const handleSelect = (res: SearchResult) => {
    let url = `/patients/${res.patient.id}`;
    if (res.kind === "diagnosis") url += "?tab=diagnosis";
    else if (res.kind === "treatment") url += "?tab=treatment";
    else if (res.kind === "reason") url += "?tab=consult";
    // name matches keep default (consult)
    router.push(url);
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
        <div className="absolute left-0 mt-1 w-full min-w-[22rem] max-h-80 overflow-auto z-50 rounded-md bg-glass backdrop-blur-lg border border-[rgba(255,255,255,0.12)] shadow-card animate-fade-in-down">
          {results.length === 0 && query.trim().length >= 3 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
          )}
          {results.map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(r)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 focus:bg-white/10 focus:outline-none"
            >
              {r.patient.photo ? (
                <img
                  src={r.patient.photo}
                  alt={r.patient.name}
                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-200 text-ink font-semibold flex items-center justify-center text-[0.625rem]">
                  {(r.patient.firstName?.[0] || "").toUpperCase()}
                  {(r.patient.lastName?.[0] || "").toUpperCase()}
                </div>
              )}
              <span className="truncate flex-1 text-left">
                {r.patient.name || r.patient.id}
                {r.kind !== "name" && r.snippet && (
                  <>
                    {" "}
                    <span className="opacity-60">&gt; {r.snippet}</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 