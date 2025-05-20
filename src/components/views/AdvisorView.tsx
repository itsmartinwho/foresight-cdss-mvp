import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

// Local types for Web Speech API to avoid 'any'
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

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
  const userHasScrolledUpRef = useRef(userHasScrolledUp); // Ref to hold the latest userHasScrolledUp
  const [dictating, setDictating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [includePapers, setIncludePapers] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync userHasScrolledUp state to ref
  useEffect(() => {
    userHasScrolledUpRef.current = userHasScrolledUp;
  }, [userHasScrolledUp]);

  const SCROLL_THRESHOLD = 1; // Pixels from bottom to consider "not at bottom" - Extremely sensitive

  // Re-enable user scroll effect: remove comment markers
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => { 
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      const atBottom = distanceToBottom <= SCROLL_THRESHOLD;
      const newScrolledUpState = !atBottom;
      
      setUserHasScrolledUp(prevScrolledUp => prevScrolledUp !== newScrolledUpState ? newScrolledUpState : prevScrolledUp);
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }, []); // scrollRef.current is stable, so empty dependency array is fine.

  // Auto-scroll when messages change
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) {
      return;
    }

    const animationFrameId = requestAnimationFrame(() => {
      const lastMessage = messages[messages.length - 1];
      const assistantIsResponding = lastMessage && lastMessage.role === "assistant";

      // Only auto-scroll if the user hasn't manually scrolled up (checked via ref) AND the assistant is the one "typing".
      // Scrolling for new user messages is handled in handleSend.
      if (!userHasScrolledUpRef.current && assistantIsResponding) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "auto" }); // Changed to 'auto' for immediacy
      }
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [messages]); // Now only depends on messages, reads userHasScrolledUp from ref

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
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart + " ";
            }
          }
          if (finalTranscript) {
            setInput((prev) => prev + finalTranscript);
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

    const newUserMessage: ChatMessage = { role: "user", content };
    // Add user message and a placeholder for the assistant's response
    // Ensure the placeholder is added so the auto-scroll useEffect can pick up on assistant responding.
    setMessages(prevMessages => [...prevMessages, newUserMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsSending(true);
    setUserHasScrolledUp(false); // IMPORTANT: Reset scroll lock state, user wants to see new messages.

    // Ensure view scrolls to the new message immediately
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.filter(m => m.role !== 'system').concat([newUserMessage]), // Send current messages + new user message
          model: thinkMode ? "o3-mini" : "gpt-4.1",
        }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let assistantText = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value);
        setMessages((prev) => {
          const cloned = [...prev];
          // Update the last message (assistant's placeholder)
          if (cloned.length > 0 && cloned[cloned.length - 1].role === "assistant") {
             cloned[cloned.length - 1].content = assistantText;
          } else {
            // This case should ideally not happen if placeholder was added correctly
            cloned.push({ role: "assistant", content: assistantText });
          }
          return cloned;
        });
      }

      if (voiceMode && assistantText) speak(assistantText);
    } catch (err) {
      console.error(err);
      // On error, remove the optimistic assistant placeholder message if it's still empty,
      // or if it was the one being streamed to.
      setMessages(prev => {
        const lastMsg = prev[prev.length -1];
        if(lastMsg && lastMsg.role === 'assistant' && (lastMsg.content === "" || prev.find(m => m === lastMsg))) {
          return prev.slice(0, -1);
        }
        return prev;
      });
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
      <ContentSurface fullBleed className="">
        {!messages.some((m) => m.role === "user") && (
          <h1 className="text-2xl font-medium self-center mb-4">Ask Foresight</h1>
        )}

        {/* Using Radix ScrollArea now -  REPLACE with native scroll div */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 p-6 overflow-y-auto" // Apply flex, min-height, padding, and overflow to this div
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