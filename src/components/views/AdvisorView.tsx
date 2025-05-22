import React, { useEffect, useRef, useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Mic,
  Send,
  BookOpen,
  Sparkles,
  Waves,
  Plus,
} from "lucide-react";
import { createPortal } from "react-dom";
import ContentSurface from '@/components/layout/ContentSurface';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, AssistantMessageContent } from '../advisor/chat-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { parser as smd_parser, default_renderer as smd_default_renderer, parser_write as smd_parser_write, parser_end as smd_parser_end } from '../advisor/streaming-markdown/smd';

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

export default function AdvisorView() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: uuidv4(), role: "system", content: "Ask Foresight" }]);
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

  // Refs for streaming-markdown (one parser + root div per assistant message)
  const parsersRef = useRef<Record<string, any>>({});
  const markdownRootsRef = useRef<Record<string, HTMLDivElement>>({});

  // Use a ref to store the ID of the current assistant message being streamed to.
  // This helps manage state updates correctly within the EventSource callbacks.
  const currentAssistantMessageIdRef = useRef<string | null>(null);

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

    let queryContent = input.trim();
    if (includePapers) queryContent += "\n\nInclude recent peer-reviewed medical papers.";

    const userMessage: ChatMessage = { id: uuidv4(), role: "user", content: queryContent };

    // Prepare assistant placeholder
    const assistantId = uuidv4();
    currentAssistantMessageIdRef.current = assistantId;

    const markdownRootDiv = document.createElement('div');
    markdownRootsRef.current[assistantId] = markdownRootDiv;
    parsersRef.current[assistantId] = smd_parser(smd_default_renderer(markdownRootDiv));

    setMessages((prev) => [...prev, userMessage, {
      id: assistantId,
      role: "assistant",
      content: { isMarkdownStream: true } as AssistantMessageContent,
      isStreaming: true,
    }]);

    setInput("");
    setIsSending(true);
    setUserHasScrolledUp(false);

    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });

    // Build payload with only past user messages (strings) and the new user message to avoid OpenAI type errors
    const apiPayloadMessages = [
      ...messages
        .filter(m => m.role === 'user' && typeof m.content === 'string')
        .map(m => ({ role: 'user' as const, content: m.content as string })),
      { role: 'user' as const, content: queryContent }
    ];

    const eventSource = new EventSource(`/api/advisor?payload=${encodeURIComponent(JSON.stringify({ messages: apiPayloadMessages }))}&think=${thinkMode}`);

    eventSource.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "markdown_chunk" && data.content) {
          smd_parser_write(parsersRef.current[assistantId], data.content);
        } else if (data.type === "stream_end") {
          if (parsersRef.current[assistantId]) {
            smd_parser_end(parsersRef.current[assistantId]);
            delete parsersRef.current[assistantId];
          }
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m));
          setIsSending(false);
          eventSource.close();
        } else if (data.type === "error") {
          console.error("SSE Error:", data.message);
          if (parsersRef.current[assistantId]) {
            smd_parser_end(parsersRef.current[assistantId]);
            delete parsersRef.current[assistantId];
          }
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false, content: { ...(m.content as AssistantMessageContent), isFallback: true, fallbackMarkdown: `**Error:** ${data.message}` } } : m));
          setIsSending(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE data", ev.data, err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      if (parsersRef.current[assistantId]) {
        smd_parser_end(parsersRef.current[assistantId]);
        delete parsersRef.current[assistantId];
      }
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, isStreaming: false, content: { ...(m.content as AssistantMessageContent), isFallback: true, fallbackMarkdown: "**Error:** Connection issue or stream interrupted." } } : m));
      setIsSending(false);
      eventSource.close();
    };
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
        {/* Removed static header; using system message in chat */}

        {/* Using Radix ScrollArea now -  REPLACE with native scroll div */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 p-6 overflow-y-auto"
        >
          <div className="w-full max-w-5xl mx-auto space-y-6 pb-44"> {/* Centered to input box width */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col items-start gap-2",
                  msg.role === "user" ? "items-end" : ""
                )}
              >
                <div
                  className={cn(
                    msg.role === "user"
                      ? "max-w-[66.666%] w-fit bg-foresight-teal-darker/70 text-white p-6"
                      : msg.role === "assistant"
                      ? "max-w-full w-fit bg-white/90 text-gray-800 p-6"
                      : msg.role === "system"
                      ? "max-w-full w-fit bg-white/90 text-gray-800 p-6"
                      : "hidden",
                    "rounded-lg text-sm shadow-sm"
                  )}
                >
                  {msg.role === "user" && typeof msg.content === 'string' && msg.content}
                  {msg.role === "system" && typeof msg.content === 'string' && (
                    msg.content === "Ask Foresight" ? (
                      <div className="flex justify-center items-center">
                        <span className="bg-gradient-to-br from-teal-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent font-medium sheen">
                          {msg.content}
                        </span>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )
                  )}
                  {msg.role === "assistant" && typeof msg.content === 'object' && (
                    <AssistantMessageRenderer 
                      assistantMessage={msg.content as AssistantMessageContent} 
                      isStreaming={msg.isStreaming} 
                      markdownRootDiv={markdownRootsRef.current[msg.id]} 
                    />
                  )}
                  {/* Loading indicators */}
                  {msg.role === "assistant" && 
                   msg.isStreaming && 
                   typeof msg.content === 'object' && 
                   (((msg.content as AssistantMessageContent).content?.length ?? 0) === 0) && (
                    <> {/* Use a fragment to conditionally render one of the indicators */}
                      {thinkMode && (
                        <div className="animate-pulse">Thinking...</div>
                      )}
                      {!thinkMode && isSending && (
                        <div className="animate-pulse">Foresight is typing...</div>
                      )}
                    </>
                  )}
                </div>
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
            <div
              className="w-full max-w-5xl bg-[rgba(255,255,255,0.35)] backdrop-blur-lg border border-white/25 rounded-2xl px-6 py-4 flex flex-col gap-3 pointer-events-auto shadow-lg"
            >
              {/* Textarea input */}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={includePapers
                  ? "Ask anything, we'll look for recent research papers in the area"
                  : thinkMode
                  ? "Reasoning mode selected for your harder medical queries"
                  : "Ask anything"}
                rows={1}
                className="resize-none bg-transparent border-0 shadow-none outline-none ring-0 ring-transparent focus:outline-none focus:ring-0 focus:ring-transparent focus-visible:ring-0 focus-visible:ring-transparent text-base px-6 py-2"
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
                  <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    <Plus className="h-[14px] w-[14px] text-foreground" />
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
                      setMessages(prev => {
                        if (!Array.isArray(prev)) return prev || [];
                        return [
                          ...prev,
                          { id: uuidv4(), role: "user", content: `[Uploaded ${file.name}]` },
                        ];
                      });
                      e.target.value = "";
                    }}
                  />
                  {/* Dictation (if not in voice mode) */}
                  {!voiceMode && typeof window !== "undefined" &&
                    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                      <Button size="icon" variant={dictating ? "default" : "ghost"} onClick={toggleDictation}>
                        <Mic className="h-4 w-4" />
                      </Button>
                    )}
                  {/* Voice or Send based on input */}
                  {input.trim().length > 0 ? (
                    <Button
                      size="icon"
                      onClick={() => handleSend()}
                      disabled={isSending}
                      className="bg-gradient-to-br from-teal-500 to-cyan-500 hover:opacity-90 text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="icon" variant={voiceMode ? "default" : "ghost"} onClick={() => setVoiceMode((v) => !v)}>
                      <Waves className="h-4 w-4" />
                    </Button>
                  )}
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

const AssistantMessageRenderer: React.FC<{ assistantMessage: AssistantMessageContent, isStreaming?: boolean, markdownRootDiv?: HTMLDivElement }> = ({ assistantMessage, isStreaming, markdownRootDiv }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && markdownRootDiv) {
      // Clear previous children
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(markdownRootDiv);
    }
  }, [markdownRootDiv]);

  const handleReferenceClick = (target: string) => {
    const element = document.getElementById(target);
    if (element) {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        let urlToOpen = target;
        try {
          const urlObj = new URL(target);
          urlObj.searchParams.append('utm_source', 'foresight');
          urlObj.searchParams.append('utm_medium', 'inline_chat_reference');
          urlToOpen = urlObj.toString();
        } catch (e) {
          console.warn("Failed to append UTM codes to URL:", target, e);
        }
        window.open(urlToOpen, '_blank');
      } else {
        const footnoteElement = document.getElementById(`footnote-${target}`);
        footnoteElement?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (assistantMessage.isFallback && assistantMessage.fallbackMarkdown) {
    const cleanHtml = DOMPurify.sanitize(assistantMessage.fallbackMarkdown);
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        // Customize heading rendering if needed
        h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-xl font-semibold my-2" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-lg font-medium my-2" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
        p: ({node, ...props}) => <p className="my-1" {...props} />,
        table: ({node, ...props}) => <table className="table-auto w-full my-2 border-collapse border border-gray-300" {...props} />,
        thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
        th: ({node, ...props}) => <th className="border border-gray-300 px-2 py-1 text-left" {...props} />,
        td: ({node, ...props}) => <td className="border border-gray-300 px-2 py-1" {...props} />,
        // Add other custom components as needed
      }}>
        {cleanHtml}
      </ReactMarkdown>
    );
  }

  if (assistantMessage.isMarkdownStream) {
    // The actual content is rendered by streaming-markdown directly into markdownRootDiv
    return <div ref={containerRef} className="prose prose-sm max-w-none" />;
  }

  return (
    <div>
      {(assistantMessage.content || []).map((element, index) => {
        return (
          <Fragment key={index}>
            {element.element === "paragraph" && <p className="mb-2">{element.text}</p>}
            {element.element === "ordered_list" && (
              <ol className="list-decimal pl-5 mb-2">
                {element.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
            )}
            {element.element === "unordered_list" && (
              <ul className="list-disc pl-5 mb-2">
                {element.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
            {element.element === "table" && (
              <div className="overflow-x-auto mb-2">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      {element.header.map((headerText, i) => (
                        <th key={i} scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r last:border-r-0 border-gray-300">
                          {headerText}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {element.rows.map((row, i) => (
                      <tr key={i} className="border-b last:border-b-0 border-gray-300">
                        {row.map((cellText, j) => (
                          <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-r last:border-r-0 border-gray-300">
                            {cellText}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {element.element === "references" && element.references && (
              <div className="mt-4 text-sm mb-2">
                <h4 className="font-semibold mb-1">References:</h4>
                <ul className="list-none pl-0">
                  {Object.entries(element.references).map(([id, text]) => (
                    <li key={id} id={`ref-${id}`} className="mb-1">
                      <a 
                        href={`#ref-${id}`} 
                        onClick={(e) => {
                          e.preventDefault();
                          handleReferenceClick(id);
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        [{id}]
                      </a>: {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Render a streaming indicator if no specific elements are present yet and streaming is active */}
            {assistantMessage.content.length === 0 && isStreaming && (
              <p className="text-gray-500"><em>Assistant is typing...</em></p>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};