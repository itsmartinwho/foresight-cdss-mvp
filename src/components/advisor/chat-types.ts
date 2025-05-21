export interface ContentElementParagraph {
  element: "paragraph";
  text: string;
  id?: string; // Optional ID
}

export interface ContentElementBold {
  element: "bold";
  text: string;
  id?: string; // Optional ID
}

export interface ContentElementItalic {
  element: "italic";
  text: string;
  id?: string; // Optional ID
}

export interface ContentElementUnorderedList {
  element: "unordered_list";
  items: string[];
  id?: string; // Optional ID
}

export interface ContentElementOrderedList {
  element: "ordered_list";
  items: string[];
  id?: string; // Optional ID
}

export interface ContentElementTable {
  element: "table";
  header: string[];
  rows: string[][];
  id?: string; // Optional ID
}

export interface ContentElementReference {
  element: "reference"; // Changed from "references" to singular "reference" for consistency with other elements
  target: string;
  display: string;
  id?: string; // Optional ID
}

// For the actual block of multiple references, let's define a separate type if needed by the server
// For now, assuming 'references' element type will contain multiple reference items
export interface ContentElementReferencesContainer {
  element: "references"; // This is the container for multiple reference links
  references: Record<string, string>; // { "1": "Nature article...", "2": "PubMed study..." }
  id?: string; // Optional ID
}

export type ContentElement =
  | ContentElementParagraph
  | ContentElementBold
  | ContentElementItalic
  | ContentElementUnorderedList
  | ContentElementOrderedList
  | ContentElementTable
  | ContentElementReference
  | ContentElementReferencesContainer; // Added ReferencesContainer

export interface AssistantMessageContent {
  content: ContentElement[];
  references?: Record<string, string>;
  isFallback?: boolean;
  fallbackMarkdown?: string;
}

export interface ChatMessage {
  id: string; // Added an ID for React keys
  role: "user" | "assistant" | "system";
  content: string | AssistantMessageContent;
  isStreaming?: boolean; // To indicate if the message is currently being streamed
} 