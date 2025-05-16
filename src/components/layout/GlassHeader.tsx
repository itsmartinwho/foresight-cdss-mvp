import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function GlassHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 glass flex items-center justify-between px-[clamp(1rem,3vw,2.5rem)]">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/foresight-icon.png" alt="Foresight Icon" className="h-6 w-6 py-0.5" />
          <img src="/images/word-logo.png" alt="Foresight Logo" className="h-6 py-0.5" />
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <Input
          placeholder="Global search…"
          className="h-8 w-64 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3"
        />
        <img
          src="https://i.pravatar.cc/32?u=clinician"
          alt="avatar"
          className="rounded-full h-8 w-8"
        />
      </div>
    </header>
  );
} 