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

  useEffect(() => {
    const openEventSource = async () => {
      if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        console.log("Skipping EventSource: No user input or messages empty, or last message not from user.");
        return;
      }

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
            const streamingMessageIdRef = useRef<string | null>(null);

            // Find the current streaming assistant message ID
            // This needs to be robust, potentially by finding the last assistant message with isStreaming: true
            setMessages(prev => {
                const lastStreamingMsg = prev.slice().reverse().find(m => m.role === 'assistant' && m.isStreaming);
                if (lastStreamingMsg) {
                    streamingMessageIdRef.current = lastStreamingMsg.id;
                }
                return prev; // No state change here, just reading
            });
            
            const currentStreamingMsgId = streamingMessageIdRef.current;

            if (!currentStreamingMsgId) {
                console.warn("No streaming message ID found for incoming SSE data.");
                return;
            }

            const currentParser = parsersRef.current[currentStreamingMsgId];
            if (!currentParser) {
                console.warn(`No parser found for message ID: ${currentStreamingMsgId}`);
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
                    smd_parser_end(parsersRef.current[currentStreamingMsgId]); // Ensure parser is ended
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
          // Find the current streaming assistant message ID
          let currentStreamingMsgIdOnError: string | null = null;
          setMessages(prev => { // Use a non-state-updating way to get the ID if possible
              const lastStreamingMsg = prev.slice().reverse().find(m => m.role === 'assistant' && m.isStreaming);
              if (lastStreamingMsg) {
                currentStreamingMsgIdOnError = lastStreamingMsg.id;
              }
              return prev;
          });

          if (currentStreamingMsgIdOnError && parsersRef.current[currentStreamingMsgIdOnError]) {
             smd_parser_end(parsersRef.current[currentStreamingMsgIdOnError]); // Ensure parser is ended
             delete parsersRef.current[currentStreamingMsgIdOnError];
          }
          
          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map(msg => 
              msg.role === 'assistant' && msg.isStreaming ? { ...msg, isStreaming: false } : msg
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

    // Open EventSource only if the last message is from the user, or if messages array is empty (initial state)
    // The `openEventSource` itself has a guard for messages.length > 0 and last message being user.
    // This effect should run when `messages` changes to potentially trigger a new stream.
    openEventSource();

    // Cleanup function for this effect
    return () => {
      // Close event source if it's open when dependencies change in a way that stops streaming
      // (e.g., user navigates away, or sends a new message which will trigger a new effect run)
      // This check is important: only close if there's an active stream that this effect instance "owns".
      // However, the main unmount cleanup already handles eventSourceRef.current.
    };
  }, [messages.length]);

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