import React, { useState, useRef, useEffect } from "react";
import { EventSource } from "event-source-polyfill";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage, AssistantMessageContent } from "@/components/advisor/chat-types";
import ContentElementRenderer from "@/components/views/advisor/ContentElementRenderer";

const AdvisorView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Store the EventSource instance
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to close the EventSource - Defined in component scope
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
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  useEffect(() => {
    // Function to open the EventSource
    const openEventSource = async () => {
      try {
        const eventSource = new EventSource(
          "http://localhost:3001/api/v1/advisor/events"
        );

        eventSourceRef.current = eventSource;

        eventSource.onmessage = (ev) => {
          console.debug("SSE recv:", ev.data); // Log raw received data
          try {
            const data = JSON.parse(ev.data);
            switch (data.type) {
              case "structured_block": {
                // Find the index of the last assistant message
                const lastAssistantMessageIndex = messages.findIndex(
                  (msg) => msg.role === "assistant" && msg.isStreaming
                );

                if (lastAssistantMessageIndex !== -1) {
                  setMessages((prevMessages) => {
                    const prevMessagesCopy = [...prevMessages];
                    const lastAssistantMessage = prevMessagesCopy[lastAssistantMessageIndex];

                    // Ensure the content property is treated as AssistantMessageContent
                    const currentContent = lastAssistantMessage.content as AssistantMessageContent;

                    // Add the new structured element to the content array
                    const updatedContent: AssistantMessageContent = {
                        ...currentContent,
                        content: Array.isArray(currentContent.content) ? [...currentContent.content, data.element] : [data.element], // Ensure content is array
                        isFallback: false, // Switch off fallback if it was on
                        fallbackMarkdown: "" // Clear fallback markdown
                    };

                    // Update the message in the array
                    prevMessagesCopy[lastAssistantMessageIndex] = {
                        ...lastAssistantMessage,
                         content: updatedContent,
                         isStreaming: true, // Still streaming until stream_end
                    };

                    return prevMessagesCopy;
                  });
                } else {
                  // If no streaming assistant message found, create a new one
                   const newAssistantMessage: ChatMessage = {
                        id: `msg-${Date.now()}-structured-${messages.length}`,
                        role: "assistant",
                        content: {
                            content: [data.element], // Initialize with the first structured element
                            isFallback: false,
                            fallbackMarkdown: ""
                        } as AssistantMessageContent, // Cast to AssistantMessageContent
                        isStreaming: true,
                   }
                   setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
                }
                break;
              }

              case "fallback_initiated": {
                 // Find the index of the last assistant message
                const lastAssistantMessageIndex = messages.findIndex(
                  (msg) => msg.role === "assistant" && msg.isStreaming
                );

                if (lastAssistantMessageIndex !== -1) {
                  setMessages((prevMessages) => {
                    const prevMessagesCopy = [...prevMessages];
                    const lastAssistantMessage = prevMessagesCopy[lastAssistantMessageIndex];

                     // Ensure the content property is treated as AssistantMessageContent
                    const currentContent = lastAssistantMessage.content as AssistantMessageContent;

                    // Mark the message as fallback
                    const updatedContent: AssistantMessageContent = {
                        ...currentContent,
                        content: Array.isArray(currentContent.content) ? currentContent.content : [], // Preserve structured content if any
                        isFallback: true, // Engage fallback
                        fallbackMarkdown: currentContent.fallbackMarkdown || "" // Keep existing or initialize
                    };

                     // Update the message in the array
                    prevMessagesCopy[lastAssistantMessageIndex] = {
                        ...lastAssistantMessage,
                         content: updatedContent,
                         isStreaming: true, // Still streaming until stream_end
                    };

                    return prevMessagesCopy;
                  });
                } else {
                  // If no streaming assistant message found, create a new fallback message
                   const newFallbackMessage: ChatMessage = {
                        id: `msg-${Date.now()}-fallback-${messages.length}`,
                        role: "assistant",
                        content: {
                            content: [],
                            isFallback: true,
                            fallbackMarkdown: ""
                        } as AssistantMessageContent, // Cast to AssistantMessageContent
                        isStreaming: true,
                   }
                   setMessages((prevMessages) => [...prevMessages, newFallbackMessage]);
                }
                break;
              }

              case "markdown_chunk": {
                 // Find the index of the last assistant message which is in fallback mode and streaming
                const lastFallbackMessageIndex = messages.findIndex(
                  (msg) => msg.role === "assistant" && (msg.content as AssistantMessageContent).isFallback && msg.isStreaming
                );

                if (lastFallbackMessageIndex !== -1) {
                   setMessages((prevMessages) => {
                    const prevMessagesCopy = [...prevMessages];
                    const lastFallbackMessage = prevMessagesCopy[lastFallbackMessageIndex];

                    // Ensure the content property is treated as AssistantMessageContent
                    const currentContent = lastFallbackMessage.content as AssistantMessageContent;

                    // Append markdown content
                    const updatedContent: AssistantMessageContent = {
                        ...currentContent,
                        fallbackMarkdown: (currentContent.fallbackMarkdown || "") + data.content, // Append markdown chunk
                    };

                    // Update the message in the array
                    prevMessagesCopy[lastFallbackMessageIndex] = {
                         ...lastFallbackMessage,
                         content: updatedContent,
                         isStreaming: true, // Still streaming until stream_end
                    };

                    return prevMessagesCopy;
                  });
                } else {
                    // This case shouldn't ideally happen if fallback_initiated is sent first,
                    // but if a markdown chunk arrives without a preceding fallback_initiated,
                    // create a new fallback message.
                    const newMarkdownMessage: ChatMessage = {
                        id: `msg-${Date.now()}-markdown-chunk-${messages.length}`,
                        role: "assistant",
                         content: {
                            content: [],
                            isFallback: true,
                            fallbackMarkdown: data.content,
                        } as AssistantMessageContent, // Cast to AssistantMessageContent
                        isStreaming: true,
                    }
                    setMessages((prevMessages) => [...prevMessages, newMarkdownMessage]);
                }
                break;
              }

              case "error": {
                // Handle errors from the server
                console.error("Server error message:", data.message);
                 const errorMessage: ChatMessage = {
                   id: `msg-${Date.now()}-error-${messages.length}`,
                   role: "assistant",
                   content: {
                       content: [],
                       isFallback: true,
                       fallbackMarkdown: `Error: ${data.message}` // Display error as markdown
                   } as AssistantMessageContent,
                   isStreaming: false, // Streaming stops on error
                 }
                 setMessages((prevMessages) => [...prevMessages, errorMessage]);
                setIsLoading(false);
                closeEventSource(); // Close the stream on error
                break;
              }

              case "stream_end": {
                // The stream has ended gracefully
                console.log("Stream ended.");
                // Find the index of the last assistant message that is streaming
                const lastStreamingMessageIndex = messages.findIndex(
                  (msg) => msg.role === "assistant" && msg.isStreaming
                );

                if (lastStreamingMessageIndex !== -1) {
                   setMessages((prevMessages) => {
                    const prevMessagesCopy = [...prevMessages];
                    const lastStreamingMessage = prevMessagesCopy[lastStreamingMessageIndex];

                    // Mark the message as not streaming
                    prevMessagesCopy[lastStreamingMessageIndex] = {
                         ...lastStreamingMessage,
                         isStreaming: false,
                    };
                    return prevMessagesCopy;
                  });
                }

                setIsLoading(false);
                closeEventSource(); // Close the stream when done
                break;
              }

              default:
                console.warn("Unknown event type:", data.type);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE data:", ev.data, parseError);
            // Handle parsing error - maybe display a message to the user
             const parseErrorMessage: ChatMessage = {
               id: `msg-${Date.now()}-parse-error-${messages.length}`,
               role: "assistant",
               content: {
                   content: [],
                   isFallback: true,
                   fallbackMarkdown: `Error parsing message from server.` // Display error as markdown
               } as AssistantMessageContent,
               isStreaming: false, // Streaming stops on error
             }
             setMessages((prevMessages) => [...prevMessages, parseErrorMessage]);
             setIsLoading(false);
             closeEventSource(); // Close the stream on parse error
          }
        };

        eventSource.onerror = (errorEvent) => {
          console.error("EventSource error:", errorEvent); // Log the full error event
          // An error occurred, potentially before a stream_end
          setIsLoading(false);
          // Check if the error is due to the stream being closed normally
          // This might not be reliable across all browsers/errors
          // A robust solution relies on the server sending stream_end before closing
          if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CLOSED) {
            console.log("EventSource closed by server.");
             // If the last message is streaming, mark it as not streaming
            const lastStreamingMessageIndex = messages.findIndex(
              (msg) => msg.role === "assistant" && msg.isStreaming
            );
             if (lastStreamingMessageIndex !== -1) {
                 setMessages((prevMessages) => {
                    const prevMessagesCopy = [...prevMessages];
                    const lastStreamingMessage = prevMessagesCopy[lastStreamingMessageIndex];

                    // Mark the message as not streaming
                    prevMessagesCopy[lastStreamingMessageIndex] = {
                         ...lastStreamingMessage,
                         isStreaming: false,
                    };
                    return prevMessagesCopy;
                  });
             }

          } else {
            console.error("EventSource encountered an error before closing.");
            // Optionally add a user-facing error message if the stream didn't end gracefully
             const connectionErrorMessage: ChatMessage = {
               id: `msg-${Date.now()}-connection-error-${messages.length}`,
               role: "assistant",
               content: {
                   content: [],
                   isFallback: true,
                   fallbackMarkdown: `Connection error. Please try again.` // Display connection error
               } as AssistantMessageContent,
               isStreaming: false, // Streaming stops on error
             }
             setMessages((prevMessages) => [...prevMessages, connectionErrorMessage]);
          }
          closeEventSource(); // Ensure it's closed on error
        };
      } catch (e) {
        console.error("Error opening EventSource:", e);
        setIsLoading(false);
      }
    };

    openEventSource();
  }, [messages.length]); // Depend on messages.length to correctly find the last message index

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message) => (
        <div key={message.id}>
          {/* Pass message.content to AssistantMessageRenderer if it's an assistant message */}
          {message.role === "assistant" && typeof message.content !== 'string' && (
             <AssistantMessageRenderer message={message.content} />
          )}
           {/* Render user or system messages directly or with a different renderer */}
           {message.role !== "assistant" && (
              <div className={
                `p-2 rounded-lg max-w-xs ${message.role === "user" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 text-black mr-auto"}`
              }>
                {message.content as string} {/* Assuming user/system messages have string content */}
              </div>
           )}
        </div>
      ))}
    </div>
  );
};

function AssistantMessageRenderer({
  message,
}: {
  message: AssistantMessageContent;
}) {
  // Use DOMPurify to sanitize HTML generated from Markdown
  const sanitizedMarkdown = DOMPurify.sanitize(message.fallbackMarkdown || "");

  return (
    <div className="flex flex-col gap-2">
      {message.isFallback ? (
        // Render raw markdown if fallback is active
        // Add CSS classes for wrapping
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {sanitizedMarkdown}
          </ReactMarkdown>
        </div>
      ) : (
        // Render structured content elements
        // Ensure message.content is an array before mapping and that the content is AssistantMessageContent
        Array.isArray(message.content) && message.content.map((element, index) => (
          <div key={index}>{/* Using index as key is acceptable here as elements are only appended */}
            <ContentElementRenderer element={element} />
          </div>
        ))
      )}
    </div>
  );
}

export default AdvisorView; 