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

// Define and export the valid element types for use by both client and server
export const VALID_ELEMENT_TYPES = [
  "paragraph",
  "bold",
  "italic",
  "unordered_list",
  "ordered_list",
  "table",
  "reference",
  "references" // Assuming "references" is the container type, adjust if ContentElementReference is the one to validate against for individual refs
] as const;

// Guideline reference interface for advisor responses
export interface GuidelineReference {
  id: string;
  title: string;
  source: 'USPSTF' | 'NICE' | 'NCI_PDQ' | 'RxNorm';
  url?: string;
  summary?: string;
  grade?: string;
  specialty?: string;
}

export interface AssistantMessageContent {
  content?: ContentElement[]; // Made optional
  references?: Record<string, string>;
  guidelineReferences?: GuidelineReference[]; // Added for clinical guideline references
  isFallback?: boolean;
  fallbackMarkdown?: string; // Made optional
  isMarkdownStream?: boolean; // Added for smd.js integration
  toolCode?: { language: string; content: string; };
  codeInterpreterOutputText?: string;
  codeInterpreterImageId?: string;
  finalMarkdown?: string;
  codeInterpreterTableData?: {
    columns: Array<{ accessorKey: string; header: string }>;
    data: Array<Record<string, any>>;
  } | null;
  codeInterpreterOutputFormat?: 'json' | 'csv' | 'plaintext';
  chartLoading?: boolean; // For showing chart loading placeholder
  heartbeatMessage?: string; // For showing progress during long operations
}

export interface ChatMessage {
  id: string; // Added an ID for React keys
  role: "user" | "assistant" | "system";
  content: string | AssistantMessageContent;
  isStreaming?: boolean; // To indicate if the message is currently being streamed
} 