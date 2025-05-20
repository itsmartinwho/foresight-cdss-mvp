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
import { ChatMessage, AssistantMessageContent, ContentElement } from '../advisor/chat-types';

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

    const newUserMessage: ChatMessage = { id: uuidv4(), role: "user", content: queryContent };
    
    const assistantMessageId = uuidv4();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: { content: [], references: {} }, 
      isStreaming: true,
    };

    setMessages(prevMessages => {
      const explicitlyConstructedUserMessage: ChatMessage = {
        id: newUserMessage.id,
        role: newUserMessage.role,
        content: newUserMessage.content,
        // isStreaming is optional, so it's fine if newUserMessage doesn't explicitly have it 
        // (it would be undefined, which is acceptable for an optional field)
      };
      const newMessages: ChatMessage[] = [
        ...prevMessages,
        explicitlyConstructedUserMessage, // Use the very explicitly constructed object
        initialAssistantMessage
      ];
      return newMessages;
    });
    setInput("");
    setIsSending(true);
    setUserHasScrolledUp(false); 

    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    });

    try {
      // Explicitly type the payload for the OpenAI API call
      const apiPayloadMessages: Array<{role: 'user' | 'assistant' | 'system', content: string}> = messages
        .filter(m => m.role !== 'system') // Filter out system messages from history
        .map(currentMessageInMap => ({
          role: currentMessageInMap.role,
          // Convert assistant's structured content to JSON string for the API
          content: typeof currentMessageInMap.content === 'string' 
                     ? currentMessageInMap.content 
                     : JSON.stringify(currentMessageInMap.content)
        }))
        .concat([{
          role: newUserMessage.role as 'user', // Role of newUserMessage is known
          content: newUserMessage.content as string // Content of newUserMessage is string
        }]);

      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiPayloadMessages, // Use the explicitly typed array
          model: thinkMode ? "o3-mini" : "gpt-4.1",
        }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          ));
          // Final parse attempt for any remaining buffer, though ideally OpenAI JSON mode sends a single complete object.
          try {
            const finalJson = JSON.parse(buffer) as AssistantMessageContent;
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId ? { ...msg, content: finalJson, isStreaming: false } : msg
            ));
            if (voiceMode && finalJson.content.length > 0) {
              // For voice, concatenate paragraph text for now. More sophisticated speech generation could be added.
              const speechText = finalJson.content
                .filter(el => el.type === 'paragraph' && el.text)
                .map(el => (el as any).text)
                .join(' ');
              if (speechText) speak(speechText);
            }
          } catch (e) {
            // If parsing fails at the very end, it might indicate an issue with the stream or LLM response.
            // The message might remain partially filled or show an error.
            console.error("Final JSON parse failed:", e);
             setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId ? { ...msg, content: { content: [{type: 'paragraph', text: `Error: Could not parse full response. Partial data: ${buffer}`}], references: {}}, isStreaming: false } : msg
            ));
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        
        // Try to parse the buffer progressively
        // This is a basic approach. For very large JSON, more robust partial parsing might be needed.
        // However, with OpenAI's JSON mode, it should ideally stream a well-formed JSON object.
        try {
          const parsedJson = JSON.parse(buffer) as AssistantMessageContent;
          // If parse succeeds, it means the full JSON object has been received.
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: parsedJson, isStreaming: true } : msg
          ));
        } catch (e) {
          // JSON is not yet complete/valid, continue accumulating
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: { content: [{type: 'paragraph', text: `Error: ${err.message}`}], references: {}}, isStreaming: false } 
          : msg
      ));
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
                      ? "max-w-[66.666%] w-fit bg-foresight-teal-darker/70 text-white"
                      : msg.role === "assistant"
                      ? "max-w-full w-fit bg-white/90 text-gray-800"
                      : msg.role === "system"
                      ? "w-fit bg-gray-200/15 text-gray-700 flex justify-center"
                      : "hidden",
                    "rounded-lg p-4 text-sm shadow-sm"
                  )}
                >
                  {msg.role === "user" && typeof msg.content === 'string' && msg.content}
                  {msg.role === "system" && typeof msg.content === 'string' && (
                    <span className="bg-gradient-to-br from-teal-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent font-medium sheen">
                      {msg.content}
                    </span>
                  )}
                  {msg.role === "assistant" && typeof msg.content === 'object' && (
                    <AssistantMessageRenderer assistantMessage={msg.content as AssistantMessageContent} />
                  )}
                  {/* Loading indicators */}
                  {msg.role === "assistant" && 
                   msg.isStreaming && 
                   typeof msg.content === 'object' && 
                   (msg.content as AssistantMessageContent).content.length === 0 && (
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
                      setMessages((prev) => [
                        ...prev,
                        { id: uuidv4(), role: "user", content: `[Uploaded ${file.name}]` },
                      ]);
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

// Placeholder for AssistantMessageRenderer (to be created in a new file)
const AssistantMessageRenderer: React.FC<{ assistantMessage: AssistantMessageContent }> = ({ assistantMessage }) => {
  const handleReferenceClick = (target: string) => {
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
  };

  return (
    <div className="space-y-2">
      {(assistantMessage.content || []).map((element, index) => {
        // Use Fragment to avoid unnecessary div wrappers if an element renders multiple top-level tags (like bold/italic might if not handled carefully)
        // Or, ensure each component renders a single root or text.
        return (
          <Fragment key={index}>
            {element.type === 'paragraph' && <p>{element.text}</p>}
            {element.type === 'bold' && <p><strong>{element.text}</strong></p>}
            {element.type === 'italic' && <p><em>{element.text}</em></p>}
            {element.type === 'unordered_list' && (
              <ul className="list-disc list-inside pl-4">
                {element.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
            {element.type === 'ordered_list' && (
              <ol className="list-decimal list-inside pl-4">
                {element.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
            )}
            {element.type === 'table' && element.header && element.rows && (
              <div className="overflow-x-auto">
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
            {element.type === 'reference' && element.target && element.display && (
              <a 
                href={element.target.startsWith('http') ? element.target : `#footnote-${element.target}`}
                onClick={(e) => {
                  if (!element.target.startsWith('http')) e.preventDefault();
                  handleReferenceClick(element.target);
                }}
                className="text-blue-600 hover:underline cursor-pointer"
                target={element.target.startsWith('http') ? "_blank" : "_self"}
                rel={element.target.startsWith('http') ? "noopener noreferrer" : undefined}
              >
                {element.display}
              </a>
            )}
          </Fragment>
        );
      })}
      {assistantMessage.references && Object.keys(assistantMessage.references).length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h4 className="text-sm font-semibold mb-2">References</h4>
          <ul className="space-y-1 list-none pl-0">
            {Object.entries(assistantMessage.references).map(([key, value]) => {
              const isExternalUrl = value.startsWith('http://') || value.startsWith('https://');
              let urlToOpen = value;
              if (isExternalUrl) {
                try {
                  const urlObj = new URL(value);
                  urlObj.searchParams.append('utm_source', 'foresight');
                  urlObj.searchParams.append('utm_medium', 'chat_reference');
                  urlToOpen = urlObj.toString();
                } catch (e) {
                  console.warn("Failed to append UTM codes to URL:", value, e);
                  // urlToOpen remains original value if parsing fails
                }
              }

              return (
                <li key={key} id={`footnote-${key}`} className="text-xs text-gray-600">
                  <span className="font-medium">[{key}]</span> 
                  {isExternalUrl ? (
                    <a 
                      href={urlToOpen} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline"
                    >
                      {value} {/* Display original value */}
                    </a>
                  ) : (
                    value
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};