export interface ContentElementParagraph {
  type: "paragraph";
  text: string;
}

export interface ContentElementBold {
  type: "bold";
  text: string;
}

export interface ContentElementItalic {
  type: "italic";
  text: string;
}

export interface ContentElementUnorderedList {
  type: "unordered_list";
  items: string[];
}

export interface ContentElementOrderedList {
  type: "ordered_list";
  items: string[];
}

export interface ContentElementTable {
  type: "table";
  header: string[];
  rows: string[][];
}

export interface ContentElementReference {
  type: "reference";
  target: string;
  display: string;
}

export type ContentElement = 
  | ContentElementParagraph
  | ContentElementBold
  | ContentElementItalic
  | ContentElementUnorderedList
  | ContentElementOrderedList
  | ContentElementTable
  | ContentElementReference;

export interface AssistantMessageContent {
  content: ContentElement[];
  references?: Record<string, string>;
}

export interface ChatMessage {
  id: string; // Added an ID for React keys
  role: "user" | "assistant" | "system";
  content: string | AssistantMessageContent;
  isStreaming?: boolean; // To indicate if the message is currently being streamed
} 