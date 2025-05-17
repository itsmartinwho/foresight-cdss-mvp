import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  FileText,
  Mic,
  Send,
  Waves,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function AdvisorView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dictating, setDictating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (opts?: { includeNewPapers?: boolean; thinkHarder?: boolean }) => {
    if (!input.trim()) return;
    const userContent = opts?.includeNewPapers
      ? `${input.trim()}\n\nInclude recent peer-reviewed medical papers.`
      : input.trim();

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userContent },
    ];
    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: opts?.thinkHarder ? "gpt-3.5-turbo" : "gpt-4.1",
          includeNewPapers: !!opts?.includeNewPapers,
          thinkHarder: !!opts?.thinkHarder,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.assistant }]);
      speak(data.assistant);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <h1 className="text-2xl font-medium">Ask Foresight</h1>

      {/* Chat container */}
      <div className="relative flex flex-col flex-1 border border-border rounded-xl bg-glass backdrop-blur-sm overflow-hidden">
        <ScrollArea className="flex-1 p-6 overflow-y-auto" ref={scrollRef}>
          <div className="space-y-6 pb-32"> {/* padding bottom so last msg not hidden under input */}
            {messages.length === 0 && (
              <p className="text-muted-foreground text-base">Start the conversation by asking a medical question.</p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-xl px-5 py-3 rounded-lg whitespace-pre-wrap text-base",
                  msg.role === "user"
                    ? "ml-auto bg-gradient-to-br from-teal-500 to-cyan-500 text-white"
                    : "mr-auto bg-[rgba(255,255,255,0.07)] backdrop-blur-md"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Sticky glass input footer */}
        <div className="sticky bottom-0 left-0 right-0 w-full px-4 pb-4">{/* extra px for side padding inside rounded container */}
          <div className="relative flex items-center bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-full border border-border shadow-sm">
            {/* LEFT pill buttons inside input */}
            <div className="flex gap-2 pl-4">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                onClick={() => handleSend({ includeNewPapers: true })}
                disabled={isSending}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Papers
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                onClick={() => handleSend({ thinkHarder: true })}
                disabled={isSending}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Think
              </Button>
            </div>

            {/* Actual text input */}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
              className="flex-1 mx-2 h-12 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground text-base pl-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* RIGHT icons */}
            <div className="flex items-center gap-2 pr-4">
              {/* Upload button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="relative">
                  <ImageIcon className="h-4 w-4 absolute -left-1 top-0" />
                  <FileText className="h-4 w-4 absolute left-1 top-0" />
                </div>
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
                  // For now we just append a placeholder to messages; server-side handling TBD
                  setMessages((prev) => [
                    ...prev,
                    { role: "user", content: `[Uploaded ${file.name}]` },
                  ]);
                  e.target.value = ""; // reset
                }}
              />

              {/* Dictation */}
              {typeof window !== "undefined" &&
                ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                  <Button size="icon" variant={dictating ? "default" : "ghost"} onClick={toggleDictation}>
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              {/* Speech synthesis */}
              {typeof window !== "undefined" && window.speechSynthesis && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    speak(
                      messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content || ""
                    )
                  }
                  disabled={!messages.some((m) => m.role === "assistant")}
                >
                  <Waves className="h-4 w-4" />
                </Button>
              )}

              {/* SEND */}
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
    </div>
  );
} 