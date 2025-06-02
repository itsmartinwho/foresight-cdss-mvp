import React, { useEffect, useRef, useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Patient } from '@/lib/types';
import { Microphone as Mic, PaperPlaneTilt as Send, BookOpen, Sparkle as Sparkles, WaveSine as Waves, Plus, Upload, X } from '@phosphor-icons/react';
import { createPortal } from "react-dom";
import ContentSurface from '@/components/layout/ContentSurface';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, AssistantMessageContent } from '../advisor/chat-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { parser as smd_parser, default_renderer as smd_default_renderer, parser_write as smd_parser_write, parser_end as smd_parser_end } from '../advisor/streaming-markdown/smd';
import PatientSelectionDropdown from "@/components/advisor/PatientSelectionDropdown";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "ai/react";
import { DataTable } from "@/components/ui/data-table"; // Added
import type { ColumnDef } from "@tanstack/react-table"; // Added
import { ChartRenderer } from '@/components/advisor/chart-renderer';
import { TableRenderer } from '@/components/advisor/table-renderer';
import { detectMedicalChartCode, preparePythonCodeForExecution } from '@/components/advisor/code-detector';

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
  const [selectedPatientForContext, setSelectedPatientForContext] = useState<Patient | null>(null);

  // Refs for streaming-markdown (one parser + root div per assistant message)
  const parsersRef = useRef<Record<string, any>>({});
  const markdownRootsRef = useRef<Record<string, HTMLDivElement>>({});
  const rawMarkdownAccumulatorRef = useRef<Record<string, string>>({}); // Added ref for accumulating raw markdown

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

    // Prepare user message and assistant placeholder
    const userMessage: ChatMessage = { id: uuidv4(), role: "user", content: queryContent };
    const assistantId = uuidv4();
    currentAssistantMessageIdRef.current = assistantId;
    const markdownRootDiv = document.createElement('div');
    markdownRootsRef.current[assistantId] = markdownRootDiv;
    parsersRef.current[assistantId] = smd_parser(smd_default_renderer(markdownRootDiv));
    rawMarkdownAccumulatorRef.current[assistantId] = ""; // Initialize accumulator

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

    // Build payload with optional patient context, past messages, and new user message.
    const existingPayload = messages.reduce((acc, msg) => {
      if (msg.role === 'user' && typeof msg.content === 'string') {
        acc.push({ role: 'user' as const, content: msg.content });
      } else if (msg.role === 'assistant' && typeof msg.content === 'object') {
        // Attempt to get rendered text from the markdownRootDiv for previous assistant messages
        const rootDiv = markdownRootsRef.current[msg.id];
        if (rootDiv && rootDiv.innerText) {
          acc.push({ role: 'assistant' as const, content: rootDiv.innerText });
        } else if ((msg.content as AssistantMessageContent).isFallback && (msg.content as AssistantMessageContent).fallbackMarkdown) {
          // If it was a fallback, use that markdown
          acc.push({ role: 'assistant' as const, content: (msg.content as AssistantMessageContent).fallbackMarkdown! });
        } 
        // Optionally, add a placeholder if no content can be extracted, e.g.:
        // else { acc.push({ role: 'assistant' as const, content: "[Assistant provided a response]" }); }
      }
      return acc;
    }, [] as Array<{role: 'user' | 'assistant', content: string}>);

    // Insert patient context at the beginning if present
    const apiPayloadMessages = [] as Array<{role: 'system' | 'user' | 'assistant', content: string}>;
    if (selectedPatientForContext) {
      // Attach patient context as a system message
      apiPayloadMessages.push({
        role: 'system' as const,
        content: JSON.stringify({ patient: selectedPatientForContext }),
      });
    }
    // Append existing conversation history
    apiPayloadMessages.push(...existingPayload);
    // Add the current user's new message
    apiPayloadMessages.push({ role: 'user' as const, content: queryContent });

    const eventSource = new EventSource(`/api/advisor?payload=${encodeURIComponent(JSON.stringify({ messages: apiPayloadMessages }))}&think=${thinkMode}`);

    eventSource.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "markdown_chunk" && data.content) {
          if (parsersRef.current[currentAssistantMessageIdRef.current!]) { // Check if parser exists
            smd_parser_write(parsersRef.current[currentAssistantMessageIdRef.current!], data.content);
          }
          if (rawMarkdownAccumulatorRef.current[currentAssistantMessageIdRef.current!]) { // Check if accumulator exists
            rawMarkdownAccumulatorRef.current[currentAssistantMessageIdRef.current!] += data.content;
          }
        } else if (data.type === "tool_code_chunk" && currentAssistantMessageIdRef.current) {
          setMessages(prev => prev.map(m => {
            if (m.id === currentAssistantMessageIdRef.current && typeof m.content === 'object') {
              const currentToolCode = (m.content as AssistantMessageContent).toolCode;
              return {
                ...m,
                content: {
                  ...(m.content as AssistantMessageContent),
                  toolCode: {
                    language: data.language,
                    content: currentToolCode?.content ? currentToolCode.content + data.content : data.content,
                  }
                }
              };
            }
            return m;
          }));
        } else if (data.type === "code_interpreter_output" && currentAssistantMessageIdRef.current) {
          setMessages(prev => prev.map(m => {
            if (m.id === currentAssistantMessageIdRef.current && typeof m.content === 'object') {
              let parsedTableData = null;
              let outputFormat: 'json' | 'csv' | 'plaintext' = 'plaintext';
              let outputText = data.content; // Default to full content as text

              if (data.content && typeof data.content === 'string' &&
                  (data.content.trim().startsWith('[') && data.content.trim().endsWith(']'))) {
                try {
                  const jsonData = JSON.parse(data.content);
                  if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') {
                    const firstRowKeys = Object.keys(jsonData[0]);
                    const columns: ColumnDef<Record<string, any>>[] = firstRowKeys.map(key => ({
                      accessorKey: key,
                      header: key.charAt(0).toUpperCase() + key.slice(1),
                    }));
                    parsedTableData = { columns, data: jsonData };
                    outputFormat = 'json';
                    outputText = ""; // Clear outputText if table is successfully parsed
                  }
                } catch (e) {
                  // Not valid JSON or not the expected table structure, keep as plaintext
                  console.warn("Code interpreter output looked like JSON array but failed to parse as table:", e);
                }
              }

              const existingContent = m.content as AssistantMessageContent;
              return {
                ...m,
                content: {
                  ...existingContent,
                  codeInterpreterTableData: parsedTableData ? parsedTableData : existingContent.codeInterpreterTableData, // Preserve existing table if new data is not a table
                  codeInterpreterOutputFormat: parsedTableData ? outputFormat : existingContent.codeInterpreterOutputFormat || 'plaintext',
                  codeInterpreterOutputText: outputText ? (existingContent.codeInterpreterOutputText || "") + outputText : existingContent.codeInterpreterOutputText,
                }
              };
            }
            return m;
          }));
        } else if (data.type === "code_interpreter_image_id" && currentAssistantMessageIdRef.current) {
          setMessages(prev => prev.map(m => {
            if (m.id === currentAssistantMessageIdRef.current && typeof m.content === 'object') {
              return {
                ...m,
                content: {
                  ...(m.content as AssistantMessageContent),
                  codeInterpreterImageId: data.file_id,
                }
              };
            }
            return m;
          }));
        } else if (data.type === "stream_end" && currentAssistantMessageIdRef.current) {
          const assistantMessageId = currentAssistantMessageIdRef.current;
          if (parsersRef.current[assistantMessageId]) {
            smd_parser_end(parsersRef.current[assistantMessageId]);
          }

          const accumulatedRawMarkdown = rawMarkdownAccumulatorRef.current[assistantMessageId] || "";

          // Clean up refs for this specific message
          delete parsersRef.current[assistantMessageId];
          delete markdownRootsRef.current[assistantMessageId];
          delete rawMarkdownAccumulatorRef.current[assistantMessageId];

          setMessages(prev => prev.map(m =>
            m.id === assistantMessageId
            ? {
                ...m,
                isStreaming: false,
                content: {
                  ...(m.content as AssistantMessageContent),
                  isMarkdownStream: false, // Switch off smd rendering for the final state
                  finalMarkdown: accumulatedRawMarkdown, // Use accumulated raw markdown
                }
              }
            : m
          ));
          setIsSending(false);
          eventSource.close();
        } else if (data.type === "error") {
          console.error("SSE Error:", data.message);
          if (parsersRef.current[currentAssistantMessageIdRef.current!]) {
            smd_parser_end(parsersRef.current[currentAssistantMessageIdRef.current!]);
            delete parsersRef.current[currentAssistantMessageIdRef.current!];
          }
          setMessages(prev => prev.map(m => m.id === currentAssistantMessageIdRef.current ? { ...m, isStreaming: false, content: { ...(m.content as AssistantMessageContent), isFallback: true, fallbackMarkdown: `**Error:** ${data.message}` } } : m));
          setIsSending(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE data", ev.data, err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      if (parsersRef.current[currentAssistantMessageIdRef.current!]) {
        smd_parser_end(parsersRef.current[currentAssistantMessageIdRef.current!]);
        delete parsersRef.current[currentAssistantMessageIdRef.current!];
      }
      setMessages(prev => prev.map(m => m.id === currentAssistantMessageIdRef.current ? { ...m, isStreaming: false, content: { ...(m.content as AssistantMessageContent), isFallback: true, fallbackMarkdown: "**Error:** Connection issue or stream interrupted." } } : m));
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

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
      // TODO: Implement file attachment state and UI similar to patient context
    }
  };

  const handlePatientSelectForContext = (patient: Patient) => {
    // Set patient context attachment
    setSelectedPatientForContext(patient);
    // Close dropdown automatically handled by Radix on item click
  };

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
                      ? "max-w-[66.666%] w-fit bg-neon/30 text-black p-6"
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
                        <span className="bg-gradient-to-br from-custom-blue-teal to-white bg-clip-text text-transparent font-medium sheen">
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
            <Button variant="secondary" iconLeft={<X />} onClick={() => setVoiceMode(false)}>Exit voice mode</Button>
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
              {/* Patient context attachment tag */}
              {selectedPatientForContext && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center bg-muted/20 text-step--1 rounded-full px-3 py-1">
                    {selectedPatientForContext.name || `${selectedPatientForContext.firstName ?? ''} ${selectedPatientForContext.lastName ?? ''}`.trim() || selectedPatientForContext.id}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-2" onClick={() => setSelectedPatientForContext(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
              )}
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
                <div className="flex gap-2 items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={includePapers ? "default" : "ghost"}
                          size="icon"
                          onClick={() => setIncludePapers((v) => !v)}
                          className={cn(
                            "group",
                            includePapers && "w-auto px-3", // Active state
                            "hover:w-auto hover:px-3"     // Hover state
                          )}
                        >
                          <BookOpen className="h-4 w-4" />
                          <span className={cn("ml-2 whitespace-nowrap", includePapers ? "inline" : "hidden", "group-hover:inline")}>
                            Papers
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Papers</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={thinkMode ? "default" : "ghost"}
                          size="icon"
                          onClick={() => setThinkMode((v) => !v)}
                          className={cn(
                            "group",
                            thinkMode && "w-auto px-3", // Active state
                            "hover:w-auto hover:px-3"    // Hover state
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                          <span className={cn("ml-2 whitespace-nowrap", thinkMode ? "inline" : "hidden", "group-hover:inline")}>
                            Think
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Think</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2">
                  {/* Context and File Upload Dropdown */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "group",
                                "hover:w-auto hover:px-3" // Hover state only for this button
                              )}
                            >
                              <span className={cn("mr-2 whitespace-nowrap hidden group-hover:inline")}>
                                Attach
                              </span>
                              <Plus className="h-4 w-4 text-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <PatientSelectionDropdown
                            onPatientSelect={handlePatientSelectForContext}
                            onFileUpload={handleFileUpload}
                          />
                        </DropdownMenu>
                      </TooltipTrigger>
                      <TooltipContent><p>Attach</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Hidden File Input for onFileUpload handler */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,application/msword,text/plain"
                    multiple={false}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {/* Dictation (if not in voice mode) */}
                  {!voiceMode && typeof window !== "undefined" &&
                    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant={dictating ? "default" : "ghost"}
                              onClick={toggleDictation}
                              className={cn(
                                "group",
                                dictating && "w-auto px-3", // Active state
                                "hover:w-auto hover:px-3"   // Hover state
                              )}
                            >
                              <span className={cn("mr-2 whitespace-nowrap", dictating ? "inline" : "hidden", "group-hover:inline")}>
                                Dictate
                              </span>
                              <Mic className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Dictate</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  {/* Voice or Send based on input */}
                  {input.trim().length > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon" // Will be icon only initially
                            onClick={() => handleSend()}
                            disabled={isSending}
                            className={cn(
                              "group bg-gradient-to-br from-teal-500 to-cyan-500 hover:opacity-90 text-white",
                              "hover:w-auto hover:px-3" // Expands on hover
                            )}
                          >
                            <span className={cn("mr-2 whitespace-nowrap hidden group-hover:inline")}>
                              Send
                            </span>
                            <Send className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Send</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={voiceMode ? "default" : "ghost"}
                            onClick={() => setVoiceMode((v) => !v)}
                            className={cn(
                              "group",
                              voiceMode && "w-auto px-3", // Active state
                              "hover:w-auto hover:px-3"  // Hover state
                            )}
                          >
                            <span className={cn("mr-2 whitespace-nowrap", voiceMode ? "inline" : "hidden", "group-hover:inline")}>
                              Voice Mode
                            </span>
                            <Waves className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Voice Mode</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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

  // Helper for custom components for ReactMarkdown
  const reactMarkdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold my-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold my-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-lg font-medium my-2" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 my-2" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 my-2" {...props} />,
    p: ({node, ...props}: any) => <p className="my-1" {...props} />,
    table: ({node, ...props}: any) => <table className="table-auto w-full my-2 border-collapse border border-gray-300 dark:border-gray-600" {...props} />,
    thead: ({node, ...props}: any) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
    th: ({node, ...props}: any) => <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-gray-300 dark:border-gray-600 px-2 py-1" {...props} />,
  };

  // Common rendering for tool outputs
  const renderToolOutputs = () => (
    <>
      {assistantMessage.toolCode && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400">Generated Code:</h4>
          <pre className="text-xs overflow-x-auto bg-gray-900 dark:bg-black text-white p-2 rounded mt-1"><code>{assistantMessage.toolCode.content}</code></pre>
        </div>
      )}
      {assistantMessage.codeInterpreterTableData ? (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Data Table ({assistantMessage.codeInterpreterOutputFormat}):</h4>
          <DataTable
            columns={assistantMessage.codeInterpreterTableData.columns as ColumnDef<unknown, any>[]}
            data={assistantMessage.codeInterpreterTableData.data}
          />
        </div>
      ) : assistantMessage.codeInterpreterOutputText && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400">Code Output ({assistantMessage.codeInterpreterOutputFormat || 'plaintext'}):</h4>
          <pre className="text-xs overflow-x-auto bg-white dark:bg-gray-700 p-2 rounded mt-1">{assistantMessage.codeInterpreterOutputText}</pre>
        </div>
      )}
      {assistantMessage.codeInterpreterImageId && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Assistant generated an image: <code>{assistantMessage.codeInterpreterImageId}</code>
            <br />
            <em className="text-xs">(Image display not yet implemented)</em>
          </p>
        </div>
      )}
    </>
  );

  if (assistantMessage.isMarkdownStream && isStreaming && markdownRootDiv) {
    // Actively streaming with smd.js
    return (
      <>
        <div ref={containerRef} className="prose prose-sm max-w-none dark:prose-invert" />
        {renderToolOutputs()}
      </>
    );
  } else if (assistantMessage.finalMarkdown) {
    // Stream finished, render with ReactMarkdown
    const cleanHtml = DOMPurify.sanitize(assistantMessage.finalMarkdown);
    
    // Detect chart code blocks
    const chartCodeBlocks = detectMedicalChartCode(assistantMessage.finalMarkdown);
    console.log('AssistantMessageRenderer: Detected chart code blocks:', chartCodeBlocks);
    
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={reactMarkdownComponents}>
          {cleanHtml}
        </ReactMarkdown>
        
        {/* Render executable chart components */}
        {chartCodeBlocks.map((codeBlock) => (
          <div key={`chart-${codeBlock.id}`} className="my-4">
            {codeBlock.isChartCode && (
              <ChartRenderer
                pythonCode={preparePythonCodeForExecution(codeBlock.code)}
                description={codeBlock.description}
              />
            )}
            {codeBlock.isTableCode && !codeBlock.isChartCode && (
              <TableRenderer
                pythonCode={preparePythonCodeForExecution(codeBlock.code)}
                description={codeBlock.description}
              />
            )}
          </div>
        ))}
        
        {renderToolOutputs()}
      </div>
    );
  } else if (assistantMessage.isFallback && assistantMessage.fallbackMarkdown) {
    // Fallback logic
    const cleanHtml = DOMPurify.sanitize(assistantMessage.fallbackMarkdown);
    
    // Detect chart code blocks in fallback markdown too
    const chartCodeBlocks = detectMedicalChartCode(assistantMessage.fallbackMarkdown);
    console.log('AssistantMessageRenderer (fallback): Detected chart code blocks:', chartCodeBlocks);
    
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={reactMarkdownComponents}>
          {cleanHtml}
        </ReactMarkdown>
        
        {/* Render executable chart components */}
        {chartCodeBlocks.map((codeBlock) => (
          <div key={`chart-${codeBlock.id}`} className="my-4">
            {codeBlock.isChartCode && (
              <ChartRenderer
                pythonCode={preparePythonCodeForExecution(codeBlock.code)}
                description={codeBlock.description}
              />
            )}
            {codeBlock.isTableCode && !codeBlock.isChartCode && (
              <TableRenderer
                pythonCode={preparePythonCodeForExecution(codeBlock.code)}
                description={codeBlock.description}
              />
            )}
          </div>
        ))}
        
        {renderToolOutputs()}
      </div>
    );
  } else if (isStreaming) {
    // Still streaming but not yet using smd.js container (e.g. only tool calls so far)
    // or if markdownRootDiv is not yet available for some reason.
    return (
      <>
        {/* Optional: could show a generic "Assistant is working..." or specific tool call indicators */}
        {/* For now, tool outputs will cover this if they arrive before markdown */}
        {renderToolOutputs()}
        {/* Show pulsing if no tool output yet */}
        {!assistantMessage.toolCode && !assistantMessage.codeInterpreterOutputText && !assistantMessage.codeInterpreterImageId && (
            <div className="animate-pulse">Thinking...</div>
        )}
      </>
    );
  }

  // Default/Empty case or non-markdown structured content (legacy, if any)
  // This also includes rendering tool outputs if the message is not streaming and has no markdown.
  return (
    <div>
      {(assistantMessage.content || []).map((element, index) => {
        return (
          <Fragment key={index}>
            {element.element === "paragraph" && <p className="mb-2">{element.text}</p>}
            {/* ... other legacy structured element rendering ... */}
          </Fragment>
        );
      })}
      {renderToolOutputs()}
      {/* Loading indicator if nothing else is there but it's supposed to be streaming */}
      {isStreaming && !assistantMessage.finalMarkdown && !assistantMessage.fallbackMarkdown && (!assistantMessage.content || assistantMessage.content.length === 0) && !assistantMessage.toolCode && !assistantMessage.codeInterpreterOutputText && !assistantMessage.codeInterpreterImageId && (
         <div className="animate-pulse">Foresight is typing...</div>
      )}
    </div>
  );
};