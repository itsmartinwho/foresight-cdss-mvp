import React, { useState, useRef, useEffect } from "react";
import { EventSource } from "event-source-polyfill";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parser, default_renderer, parser_write as smd_parser_write, parser_end as smd_parser_end } from "../../../../../components/advisor/streaming-markdown/smd";
import { ChatMessage, AssistantMessageContent } from "@/components/advisor/chat-types";

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

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      console.log("Closing EventSource.");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

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
  }, []);

  // useEffect to open EventSource when a new user message is added and we are not already loading.
  useEffect(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    if (lastMessage && lastMessage.role === 'user' && !isLoading) {
      // It is important to set isLoading to true here before any async operations
      // or before the EventSource might try to add its own placeholder, to prevent re-triggers.
      // However, openEventSource itself will set the placeholder and manage isLoading for the stream.
      // The primary isLoading flag here is to prevent this effect from re-triggering for the same user message
      // if other state changes cause this effect to re-evaluate.
      // `handleSendMessage` will primarily set isLoading true.
      console.log("useEffect triggered to open EventSource for user message:", lastMessage.id);
      openEventSource();
    }

    // Cleanup function for this effect if dependencies change
    return () => {
      // If the component unmounts or dependencies change mid-stream, 
      // ensure the existing connection is closed.
      // The main unmount cleanup already calls closeEventSource(), but this can be a safeguard.
      // if (eventSourceRef.current) {
      //   console.log("useEffect cleanup: Closing EventSource due to dependency change or unmount.");
      //   closeEventSource();
      // }
    };
  // Rerun this effect if the ID of the last message changes, or if isLoading changes from true to false (signalling readiness for new msg)
  }, [messages[messages.length - 1]?.id, isLoading]);

  const openEventSource = async () => {
    // Guard: Only proceed if the last message is from the user.
    // This is a crucial guard to prevent re-opening if the effect somehow re-runs after assistant placeholder is added.
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      console.log("openEventSource: Skipped. Last message not from user or messages empty.");
      return;
    }
    
    // Guard: If an EventSource is already open and active, don't open another one.
    if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
      console.log("openEventSource: Skipped. EventSource already open and active.");
      return;
    }
    
    // Set loading state for the duration of the stream
    setIsLoading(true); 

    const thinkMode = false;
    const payload = { messages };
    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    const apiUrl = `/api/advisor?payload=${encodedPayload}&think=${thinkMode}`;

    try {
      console.debug("Opening SSE to", apiUrl);
      const eventSource = new EventSource(apiUrl);
      eventSourceRef.current = eventSource;

      const newStreamMessageId = `msg-${Date.now()}-streaming-${messages.length}`;
      
      // Create a div for the markdown content
      const markdownRootDiv = document.createElement('div');
      markdownRootsRef.current[newStreamMessageId] = markdownRootDiv;

      // Initialize parser for this message
      const newParser = parser(default_renderer(markdownRootDiv));
      parsersRef.current[newStreamMessageId] = newParser;

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: newStreamMessageId,
          role: "assistant",
          content: {
            isMarkdownStream: true,
            // Add 'content' and 'fallbackMarkdown' as optional undefined to satisfy type if needed, 
            // or ensure AssistantMessageContent truly makes them optional.
            // Based on previous chat-types.ts edit, they are optional.
          } as AssistantMessageContent,
          isStreaming: true,
        },
      ]);

      eventSource.onmessage = (ev) => {
        console.debug("SSE recv:", ev.data);
        try {
          const data = JSON.parse(ev.data);
          
          // Use newStreamMessageId directly from the closure
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
                // Use the imported smd_parser_write
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
                isMarkdownStream: true, // Render error as markdown too
                // No actual parser for this, div will be manually filled
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
                // smd_parser_end(parsersRef.current[currentStreamingMsgId]); // Call end for the original stream's parser
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
              // Don't close EventSource here if more messages can be sent/received in the session.
              // closeEventSource(); // Only close if the entire interaction is done.
              
              // Clean up the specific parser instance
              if (parsersRef.current[currentStreamingMsgId]) {
                  // Check if parser_end was already called by currentParser check above
                  if (currentParser && typeof smd_parser_end === 'function') { 
                      // smd_parser_end was called on currentParser, no need to call again
                  } else if (typeof smd_parser_end === 'function'){
                      smd_parser_end(parsersRef.current[currentStreamingMsgId]);
                  }
                  delete parsersRef.current[currentStreamingMsgId];
              }
              // The markdownRootsRef entry can remain as it holds the rendered content.
              break;
            }

            default:
              // console.log("Received unhandled SSE event type:", data.type, data);
              break;
          }
        } catch (error) {
          console.error("Error parsing SSE message or processing data:", error, ev.data);
          // Potentially display a client-side error message
          // setIsLoading(false); // Consider if loading should stop here.
          // closeEventSource(); // Close on unexpected client-side parsing error.
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        
        // Use newStreamMessageId directly from the closure for identifying the message that errored
        const currentStreamingMsgIdOnError = newStreamMessageId;

        if (currentStreamingMsgIdOnError && parsersRef.current[currentStreamingMsgIdOnError]) {
           smd_parser_end(parsersRef.current[currentStreamingMsgIdOnError]); // Ensure parser is ended
           delete parsersRef.current[currentStreamingMsgIdOnError];
        }
        
        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.map(msg => 
            // Use currentStreamingMsgIdOnError to mark the correct message as not streaming
            msg.id === currentStreamingMsgIdOnError ? { ...msg, isStreaming: false } : msg
          );
          // Add an error message to UI
          const errorDiv = document.createElement('div');
          errorDiv.innerHTML = DOMPurify.sanitize(`<strong>Error:</strong> Connection issue or stream interrupted.`);
          const errorMsgId = `msg-${Date.now()}-conn-error-${updatedMessages.length}`;
          markdownRootsRef.current[errorMsgId] = errorDiv;

          return [
            ...updatedMessages,
            {
              id: errorMsgId,
              role: "assistant",
              content: { isMarkdownStream: true } as AssistantMessageContent,
              isStreaming: false,
            }
          ];
        });

        setIsLoading(false);
        closeEventSource();
      };
    } catch (error) {
      console.error("Failed to open EventSource:", error);
      setIsLoading(false);
      // Display an error message in the chat
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = DOMPurify.sanitize(`<strong>Error:</strong> Could not connect to the advisor service.`);
      const errorMsgId = `msg-${Date.now()}-connect-error-${messages.length}`;
      markdownRootsRef.current[errorMsgId] = errorDiv;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: errorMsgId,
          role: "assistant",
          content: { isMarkdownStream: true } as AssistantMessageContent,
          isStreaming: false,
        },
      ]);
    }
  };

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