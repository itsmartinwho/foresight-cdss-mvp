import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  FileText,
  Mic,
  Send,
  BookOpen,
  Sparkles,
  Waves,
} from "lucide-react";
import { createPortal } from "react-dom";
import ContentSurface from '@/components/layout/ContentSurface';

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function AdvisorView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const [dictating, setDictating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [includePapers, setIncludePapers] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SCROLL_THRESHOLD = 100; // Pixels from bottom

  // Re-enable user scroll effect: remove comment markers
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const atBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;
      setUserHasScrolledUp(!atBottom);
    };

    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedHandleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollElement.addEventListener("scroll", debouncedHandleScroll);
    return () => {
      scrollElement.removeEventListener("scroll", debouncedHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      const viewport = scrollRef.current;
      if (!viewport) {
        console.log("AdvisorView (Debug RAF): scrollRef.current is null");
        return;
      }

      // pridestaff-debug-log (RAF)
      console.log("AdvisorView (Debug RAF): Auto-scroll check", {
        scrollHeight: viewport.scrollHeight,
        clientHeight: viewport.clientHeight,
        scrollTop: viewport.scrollTop,
        userHasScrolledUp,
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      });

      const lastMsg = messages[messages.length - 1];
      if (!userHasScrolledUp || (lastMsg && lastMsg.role === "user")) {
        // pridestaff-debug-log (RAF)
        console.log("AdvisorView (Debug RAF): Attempting to scroll", {
          targetScrollTop: viewport.scrollHeight,
          behavior: "smooth",
          timestamp: new Date().toISOString(),
        });
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      }
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [messages, userHasScrolledUp]);

  // Voice dictation setup
  const recognitionRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setInput((prev) => prev + transcript + " ");
            } else {
              interim += transcript;
            }
          }
        };
      }
    }
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) return;
    if (!dictating) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
    setDictating(!dictating);
  };

  const speak = (text: string) => {
    if (!voiceMode) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    let content = input.trim();
    if (includePapers) content += "\n\nInclude recent peer-reviewed medical papers.";

    const updatedMessages: ChatMessage[] = [...messages, { role: "user", content }];

    // Add placeholder assistant msg for streaming
    setMessages([...updatedMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          model: thinkMode ? "gpt-3.5-turbo" : "gpt-4.1",
        }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      // Make sure to reset scroll lock when assistant starts responding if user was at bottom
      if (!userHasScrolledUp && scrollRef.current) {
         scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }

      let assistantText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value);
        setMessages((prev) => {
          const cloned = [...prev];
          cloned[cloned.length - 1] = { role: "assistant", content: assistantText };
          return cloned;
        });
      }

      if (voiceMode && assistantText) speak(assistantText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // ESC key exits voice mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVoiceMode(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <ContentSurface fullBleed className="p-6 space-y-4">
        {!messages.some((m) => m.role === "user") && (
          <h1 className="text-2xl font-medium self-center">Ask Foresight</h1>
        )}

        {/* Temporary plain div for testing - now a direct child of ContentSurface */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 p-6 overflow-y-auto bg-red-500/10" // Added a light red background for visual debugging
          data-testid="plain-scrolling-div"
        >
          <div className="space-y-6 pb-44"> {/* This is the inner content div */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-xl px-5 py-3 rounded-lg whitespace-pre-wrap text-sm",
                  msg.role === "user"
                    ? "ml-auto bg-gradient-to-br from-teal-500 to-cyan-500 text-white"
                    : "mr-auto bg-[rgba(255,255,255,0.12)] backdrop-blur-md"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </div>

        {/* Voice mode overlay */}
        {voiceMode && (
          <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex flex-col items-center justify-center text-center px-6">
            <div className="animate-pulse mb-6">
              <Waves className="h-16 w-16 text-teal-300" />
            </div>
            <p className="text-lg mb-4">Ask your question aloud</p>
            <Button variant="secondary" onClick={() => setVoiceMode(false)}>✕ Exit voice mode</Button>
          </div>
        )}
      </ContentSurface>
      {mounted && createPortal(
        <>
          <div
            className="fixed bottom-4 flex justify-center px-6 pointer-events-none"
            style={{
              left: 'var(--actual-sidebar-width, 0rem)',
              width: 'calc(100% - var(--actual-sidebar-width, 0rem))',
              transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out',
            }}
          >
            <div className="w-full max-w-3xl bg-[rgba(255,255,255,0.55)] backdrop-blur-lg border border-white/25 rounded-xl p-4 flex flex-col gap-3 pointer-events-auto shadow-lg">
              {/* Textarea input */}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={includePapers
                  ? "Ask anything, we\'ll look for recent research papers in the area"
                  : thinkMode
                  ? "Reasoning mode selected for your harder medical queries"
                  : "Ask anything"}
                rows={1}
                className="resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              {/* Action row */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={includePapers ? "default" : "secondary"}
                    className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                    onClick={() => setIncludePapers((v) => !v)}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Papers
                  </Button>
                  <Button
                    size="sm"
                    variant={thinkMode ? "default" : "secondary"}
                    className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                    onClick={() => setThinkMode((v) => !v)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Think
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Upload */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="flex items-center text-foreground text-xs">
                      <ImageIcon className="h-[14px] w-[14px]" />
                      <span className="mx-[2px]">/</span>
                      <FileText className="h-[14px] w-[14px]" />
                    </span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,application/msword,text/plain"
                    multiple={false}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMessages((prev) => [
                        ...prev,
                        { role: "user", content: `[Uploaded ${file.name}]` },
                      ]);
                      e.target.value = ""; // Clear the input after selection
                    }}
                  />

                  {/* Dictation (only visible when not in voice mode) */}
                  {!voiceMode && typeof window !== "undefined" &&
                    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                      <Button size="icon" variant={dictating ? "default" : "ghost"} onClick={toggleDictation}>
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}

                  {/* Voice mode button */}
                  <Button size="icon" variant={voiceMode ? "default" : "ghost"} onClick={() => setVoiceMode((v) => !v)}>
                    <Waves className="h-4 w-4" />
                  </Button>

                  {/* Send */}
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={isSending || !input.trim()}
                    className="bg-gradient-to-br from-teal-500 to-cyan-500 hover:opacity-90 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}