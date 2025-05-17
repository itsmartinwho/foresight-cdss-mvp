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
          <div className="space-y-6 pb-44"> {/* extra bottom padding to allow for floating input */}
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm">Start the conversation by asking a medical question.</p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-xl px-5 py-3 rounded-lg whitespace-pre-wrap text-sm",
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

        {/* Fixed glass input footer overlay */}
        <div className="fixed inset-x-0 bottom-4 flex justify-center px-6 pointer-events-none">
          <div className="w-full max-w-3xl bg-[rgba(255,255,255,0.55)] backdrop-blur-lg border border-white/25 rounded-xl p-4 flex flex-col gap-3 pointer-events-auto shadow-lg">
            {/* Textarea input */}
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything"
              rows={1}
              className="resize-none bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.shiftKey) {
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
                  variant="secondary"
                  className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                  onClick={() => handleSend({ includeNewPapers: true })}
                  disabled={isSending || !input.trim()}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Papers
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full text-[0.65rem] uppercase h-7 px-3 flex items-center gap-1"
                  onClick={() => handleSend({ thinkHarder: true })}
                  disabled={isSending || !input.trim()}
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
                    e.target.value = "";
                  }}
                />

                {/* Dictation */}
                {typeof window !== "undefined" &&
                  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                    <Button size="icon" variant={dictating ? "default" : "ghost"} onClick={toggleDictation}>
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}

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
      </div>
    </div>
  );
} 