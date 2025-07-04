import React, { useState, useRef, useEffect } from "react";
import { EventSource } from "event-source-polyfill";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parser, default_renderer, parser_write as smd_parser_write, parser_end as smd_parser_end } from "../../../../../components/advisor/streaming-markdown/smd";
import { ChatMessage, AssistantMessageContent } from "@/components/advisor/chat-types";
import { useParams } from "next/navigation";

// Define a type for the parser instance from smd.js
// smd.js doesn't export a specific type for the parser object, so we use 'any'.
type SmdParser = any;

const AdvisorView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);
  // Ref to store parser instances, keyed by message ID
  const parsersRef = useRef<Record<string, SmdParser>>({});
  // Ref to store the div elements that the parsers will render into, keyed by message ID
  const markdownRootsRef = useRef<Record<string, HTMLDivElement>>({});

  // Get patientId from route params once when component mounts
  const params = useParams<{ id: string }>();
  const patientId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const closeEventSource = React.useCallback(() => {
    if (eventSourceRef.current) {
      console.log("Closing EventSource.");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Clean up the EventSource when the component unmounts
    return () => {
      closeEventSource();
      // Clean up any remaining parsers and their roots
      Object.keys(parsersRef.current).forEach(msgId => {
        if (parsersRef.current[msgId]) {
          // Assuming parser_end is the correct cleanup. If not, adjust.
          // parser_end(parsersRef.current[msgId]); 
        }
      });
      parsersRef.current = {};
      markdownRootsRef.current = {};
    };
  }, [closeEventSource]);

  const openEventSource = React.useCallback(async () => {
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      console.log("openEventSource: Skipped. Last message not from user or messages empty.");
      return;
    }
    
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      console.log("openEventSource: Skipped. EventSource already open and active.");
      return;
    }
    
    setIsLoading(true); 

    const thinkMode = false;
    const payload = { messages };
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));

    let apiUrl = `/api/advisor?payload=${encodedPayload}&think=${thinkMode}`;
    if (patientId) {
      apiUrl += `&patientId=${encodeURIComponent(patientId)}`;
    }

    try {
      console.debug("Opening SSE to", apiUrl);
      const eventSource = new EventSource(apiUrl);
      eventSourceRef.current = eventSource;

      const newStreamMessageId = `msg-${Date.now()}-streaming-${messages.length}`;
      
      const markdownRootDiv = document.createElement('div');
      markdownRootsRef.current[newStreamMessageId] = markdownRootDiv;

      const newParser = parser(default_renderer(markdownRootDiv));
      parsersRef.current[newStreamMessageId] = newParser;

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: newStreamMessageId,
          role: "assistant",
          content: {
            isMarkdownStream: true,
          } as AssistantMessageContent,
          isStreaming: true,
        },
      ]);

      eventSource.onmessage = (ev) => {
        console.debug("SSE recv:", ev.data);
        try {
          const data = JSON.parse(ev.data);
          const currentStreamingMsgId = newStreamMessageId;

          if (!currentStreamingMsgId) {
              console.warn("newStreamMessageId is null/undefined in onmessage. This should not happen.");
              return;
          }

          const currentParser = parsersRef.current[currentStreamingMsgId];
          if (!currentParser) {
              console.warn(`No parser found for message ID: ${currentStreamingMsgId}. Message might have already ended or been cleaned up.`);
              return;
          }

          switch (data.type) {
            case "markdown_chunk": {
              if (data.content) {
                smd_parser_write(currentParser, data.content);
              }
              break;
            }

            case "error": {
              console.error("Server error message:", data.message);
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === currentStreamingMsgId ? { ...msg, isStreaming: false } : msg
                )
              );
              const errorMsgId = `msg-${Date.now()}-error-${messages.length}`;
              const errorMessageContent: AssistantMessageContent = {
                isMarkdownStream: true,
              };
              const errorMessage: ChatMessage = {
                id: errorMsgId,
                role: "assistant",
                content: errorMessageContent,
                isStreaming: false,
              };
              setMessages((prevMessages) => [...prevMessages, errorMessage]);

              const errorDiv = document.createElement('div');
              errorDiv.innerHTML = DOMPurify.sanitize(`<strong>Error:</strong> ${data.message}`);
              markdownRootsRef.current[errorMsgId] = errorDiv;

              setIsLoading(false);
              closeEventSource();
              if (parsersRef.current[currentStreamingMsgId]) {
                delete parsersRef.current[currentStreamingMsgId];
              }
              break;
            }

            case "stream_end": {
              console.log("Stream ended.");
              if (currentParser) {
                smd_parser_end(currentParser);
              }
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === currentStreamingMsgId ? { ...msg, isStreaming: false } : msg
                )
              );
              setIsLoading(false);
              // No need to close if it ended normally, could be used again.
              break;
            }
          }
        } catch (error) {
          console.error("Error parsing SSE message or updating state:", error);
          setIsLoading(false);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        setIsLoading(false);
        closeEventSource();
      };
    } catch (error) {
      console.error("Failed to open EventSource:", error);
      setIsLoading(false);
    }
  }, [messages, setMessages, setIsLoading, closeEventSource, patientId]);

  // useEffect to open EventSource when a new user message is added and we are not already loading.
  useEffect(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMessageId = lastMessage?.id;

    if (lastMessage && lastMessage.role === 'user' && !isLoading) {
      console.log("useEffect triggered to open EventSource for user message:", lastMessage.id);
      openEventSource();
    }
    // Rerun this effect if the ID of the last message changes, or if isLoading changes from true to false (signalling readiness for new msg)
  }, [isLoading, openEventSource, messages]);

  const handleSendMessage = () => {
    if (userInput.trim() === "") return;

    const newUserMessage: ChatMessage = {
      id: `msg-${Date.now()}-user-${messages.length}`,
      role: "user",
      content: userInput,
    };
    
    // Set isLoading to true when a message is sent. 
    // The useEffect listening to last message ID and isLoading will pick this up.
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setUserInput("");
    // setIsLoading(true); // This will be handled by the effect or openEventSource start
  };

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => (
        <div key={message.id} className={`chat-message ${message.role}`}>
          <div className="message-content">
            {message.role === "user" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content as string}
              </ReactMarkdown>
            ) : (
              <AssistantMessageRenderer
                messageContent={message.content as AssistantMessageContent}
                messageId={message.id}
                markdownRootDiv={markdownRootsRef.current[message.id]}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Function to render AssistantMessageContent
function AssistantMessageRenderer({
  messageContent,
  messageId,
  markdownRootDiv,
}: {
  messageContent: AssistantMessageContent;
  messageId: string;
  markdownRootDiv?: HTMLDivElement;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && markdownRootDiv) {
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(markdownRootDiv);
    }
  }, [markdownRootDiv]);

  if (messageContent.isMarkdownStream) {
    return <div ref={containerRef} className="prose prose-sm max-w-none"></div>;
  }

  // Fallback for any other type of content, though current logic aims for all assistant messages to be isMarkdownStream
  // This part should ideally not be reached if all assistant responses are markdown streams.
  let sanitizedFallbackMarkdown = "";
  if (typeof messageContent.fallbackMarkdown === 'string') {
    sanitizedFallbackMarkdown = DOMPurify.sanitize(messageContent.fallbackMarkdown);
  } else if (messageContent.content && Array.isArray(messageContent.content) && messageContent.content.length > 0) {
    // This is a failsafe, ideally structured content is not mixed with this new approach
    sanitizedFallbackMarkdown = "Error: Mixed content types detected.";
  }


  // This part for non-streaming or error display could be simplified or removed
  // if errors are also pushed as markdown streams into their own divs.
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: sanitizedFallbackMarkdown }}
    />
  );
}

export default AdvisorView; 