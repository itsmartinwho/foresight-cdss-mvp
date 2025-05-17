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
          model: opts?.thinkHarder ? "gpt-3.5-turbo" : "gpt-4o-mini", // fallback names
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
      <div className="flex flex-col flex-1 border border-border rounded-xl bg-glass backdrop-blur-sm overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm">Start the conversation by asking a medical question.</p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-xl px-4 py-2 rounded-lg whitespace-pre-wrap text-sm",
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
        {/* Input bar */}
        <div className="border-t border-border p-3 flex items-center gap-2 bg-[rgba(255,255,255,0.04)] backdrop-blur-md">
          {/* Left pill buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full text-[0.7rem] uppercase"
              onClick={() => handleSend({ includeNewPapers: true })}
              disabled={isSending}
            >
              Include new papers
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full text-[0.7rem] uppercase"
              onClick={() => handleSend({ thinkHarder: true })}
              disabled={isSending}
            >
              Think harder
            </Button>
          </div>
          {/* Input */}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything"
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {/* Right icons */}
          <div className="flex items-center gap-2 pl-1">
            <Button size="icon" variant="ghost" disabled>
              {/* Combo icon */}
              <div className="relative">
                <ImageIcon className="h-4 w-4 absolute -left-1 top-0" />
                <FileText className="h-4 w-4 absolute left-1 top-0" />
              </div>
            </Button>
            {typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
              <Button size="icon" variant={dictating ? "default" : "ghost"} onClick={toggleDictation}>
                <Mic className="h-4 w-4" />
              </Button>
            )}
            {typeof window !== "undefined" && window.speechSynthesis && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => speak(messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content || "")}
                disabled={!messages.some((m) => m.role === "assistant")}
              >
                <Waves className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" onClick={() => handleSend()} disabled={isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 