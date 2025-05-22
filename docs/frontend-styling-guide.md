# Frontend Styling Guide: Input and Placeholder Consistency

This guide outlines the strategy and conventions used in the Foresight CDSS project to ensure consistent styling for input fields, their placeholder text, and selected values, particularly within modals and forms.

## Icon Library

The application now uses Phosphor Icons (`phosphor-react`) for all iconography. Icons should be imported from `phosphor-react` and aliased if necessary to maintain existing usage names. For example:

```tsx
import { MagnifyingGlass as Search, House as Home } from 'phosphor-react';
```

Avoid using `lucide-react`, as it has been replaced by `phosphor-react`.

## Core Principle

The primary goal is to have a uniform visual language for user interactions:
1.  **Placeholder State:** When a field is empty or unselected, its placeholder text (or the field itself if it's a select) should appear "paler" (medium gray, slightly transparent), use a standard smaller font size, and a light font weight.
2.  **User Input State:** Once a user types into an input or selects a value from a dropdown, the text should switch to the standard input text style: darker (default foreground color) and fully opaque, using the same standard smaller font size.

## Key CSS Variables and Tailwind Setup

These are primarily defined in `src/app/globals.css` and leveraged by Tailwind CSS.

### CSS Variables (`:root` in `globals.css`)
*   `--placeholder-color: #94a3b8;`: Defines the medium gray color (Tailwind's `slate-400`) for all placeholder text.
*   `--placeholder-opacity: 0.6;`: Sets the opacity for placeholder text to achieve the "paler" effect.
*   `--step--1: clamp(.75rem, .72rem + 0.15vw, .84rem);`: A fluid typography token for the standard "smaller" font size used across input fields and their placeholders.
*   `--font-size-step--1: var(--step--1);`: An alias for `--step--1`, available for use in JavaScript or inline styles if necessary (though direct class application is preferred).
*   `--foreground: var(--ink-val);` (where `--ink-val` is `218 20% 8%` or `#0c1116`): The standard dark color for user-inputted text.
*   `--border: 220 20% 85%;`: Standard border color for inputs.
*   `--background: var(--lavender-bg-val);`: Standard background for inputs (light theme).

### Tailwind CSS
*   The project uses Tailwind CSS. Global styles and utility classes are key.
*   `font-sans`: The default application font (Inter) defined on the `body`, inherited by inputs.
*   `.text-step--1`: A utility class defined in `globals.css` that applies `font-size: var(--step--1); line-height: 1.5; font-weight: 300;`. This is the standard class for styling the text *within* input fields and the text of selected values in dropdowns.

## Styling Guidelines by Component Type

### 1. Standard Text Inputs (using Shadcn/ui `<Input>` component)
*   **Class Name:** Apply `className="text-step--1 font-sans ..."` (plus any layout classes like `mt-1`, `w-full`).
*   **Placeholder Styling:** Handled globally by the following rule in `src/app/globals.css`:
    ```css
    input::placeholder,
    textarea::placeholder {
      color: var(--placeholder-color) !important;
      opacity: var(--placeholder-opacity) !important;
      font-size: var(--step--1) !important;
      font-weight: 300 !important;
      font-family: inherit !important;
    }
    ```
    This ensures all native placeholders get the desired look.

### 2. Select Dropdowns (native `<select>` element)
*   **Base Class Name:** Apply `className="text-step--1 font-sans ..."` (plus layout classes).
*   **Conditional Styling for Placeholder Appearance:** Use the `cn()` utility from `@/lib/utils` to switch styles based on whether a value is selected.
    *   **No Value Selected (Placeholder State):** Apply `text-[var(--placeholder-color)] opacity-[var(--placeholder-opacity)]`. The actual font size and weight come from the base `text-step--1` class.
    *   **Value Selected (User Input State):** Apply `text-foreground opacity-100`.
*   **Example (from `NewConsultationModal.tsx`):**
    ```tsx
    <select
      value={gender}
      onChange={(e) => setGender(e.target.value)}
      className={cn(
        "w-full mt-1 px-3 py-2 border rounded-md bg-background text-step--1 font-sans",
        !gender ? "text-[var(--placeholder-color)] opacity-[var(--placeholder-opacity)]" : "text-foreground opacity-100"
      )}
    >
      <option value="" disabled className="text-muted-foreground">Select gender</option>
      {/* ...other options... */}
    </select>
    ```
*   **Global CSS for Unselected/Selected State (robust, attribute-based):**
    In addition to the `cn` approach, the following rules in `globals.css` ensure robust styling for native selects:
    ```css
    select[value=""] {
      /* Unselected placeholder state */
      color: var(--placeholder-color) !important;
      opacity: var(--placeholder-opacity) !important;
    }
    select[value]:not([value=""]) {
      /* Selected value state - use standard input text styling */
      color: hsl(var(--foreground)) !important;
      opacity: 1 !important;
    }
    ```
    This ensures that even if utility classes are overridden or missed, the select will always show placeholder styling when empty and user input styling when a value is selected.

### 3. Custom Date/Time Picker (`StyledDatePicker` wrapping `react-datepicker`)
*   The `StyledDatePicker` component is located in `src/components/modals/NewConsultationModal.tsx`.
*   **Internal Input Styling:** The `<input>` element within `StyledDatePicker` is styled with the class `text-step--1 font-sans`.
*   **Placeholder Styling:** It uses a standard `placeholder` attribute, so its placeholder text is styled by the global `input::placeholder` rules in `globals.css`.
*   **Selected Value:** When a date/time is selected, it appears with the `text-step--1 font-sans` styling.
*   **Z-index for Popups:**
    *   The main calendar popup uses `popperClassName="z-[60]"` passed as a prop to `StyledDatePicker`.
    *   The time selection dropdown (if `showTimeSelect` is true) requires global CSS overrides for its z-index (currently set to `61` in `globals.css`):
        ```css
        .react-datepicker__time-container,
        .react-datepicker__time {
          z-index: 61 !important;
        }
        ```

## Adding New Fields

When adding new input fields, selects, or custom components that require placeholder text or similar input styling:
1.  **Prioritize Global Styles:** Leverage the existing global `::placeholder` styles for standard inputs and date pickers where possible.
2.  **Use Standard Classes:** Apply `text-step--1` and `font-sans` for the text of the input/selected value.
3.  **Conditional Styling for Selects:** Follow the `cn()` pattern shown above for native `<select>` elements.
4.  **Custom Components:** If building new custom input components, ensure their internal structure allows for easy application of these classes and respects the placeholder styling strategy.
5.  **Z-index:** Be mindful of z-index for any components that render popups or overlays, especially within modals. Dialogs are often `z-50`. Adjust as needed.

By following these guidelines, we can maintain a consistent and predictable user interface for form elements throughout the application.

## Advisor Chat Input/Footer (Fixed to Viewport)

The chat input/footer in the Advisor tab is implemented as a floating, glassmorphic input bar that is always anchored to the bottom of the browser viewport, regardless of chat content or scroll position.

**Implementation Details:**

- The input/footer is rendered using a React portal (`createPortal`) directly into `document.body`.
- This ensures that its `position: fixed` styling is never affected by any parent stacking context, transforms, or layout containers in the React tree.
- Crucially, the main application layout in `src/app/layout.tsx` has been configured so that its primary content area (which hosts `AdvisorView`) does not scroll. This is essential for the `position: fixed` element to remain genuinely stationary relative to the viewport, as the viewport itself won't be scrollable due to expanding page content.
- The chat area itself includes extra bottom padding (`pb-44`) to prevent the last message from being hidden behind the floating input.
- The input/footer uses the same input and placeholder styling conventions as described above, ensuring consistency with the rest of the application.

**Why use a portal?**

In complex layouts (especially with glassmorphism, backdrop filters, or transforms), CSS `position: fixed` can be scoped to the nearest ancestor with a transform or filter. By rendering the input/footer outside the main React tree (at the document body level), we guarantee it is always fixed to the viewport, providing a robust and predictable user experience.

## Chat Bubble Styling

- **User messages**: Translucent neon teal background (`bg-neon/30`) and black text (`text-black`).
- **Assistant messages**: White background with 90% opacity (`bg-white/90`) and gray-800 text (`text-gray-800`).

# Frontend Styling Guide: Outer Layout & Containers

## ContentSurface – the single frosted-glass wrapper (2025-05 refactor)

All route-level pages must render their contents inside exactly one `<ContentSurface>` component which lives at `src/components/layout/ContentSurface.tsx`.

• **Default**: a frosted-glass div with `rounded-2xl`, internal padding `p-6`, and a max-width of 80 rem (≈1280 px).
• **fullBleed**: pass `fullBleed` when the view needs the entire viewport (e.g. complex workspaces). This renders a plain flex column without glass styling.

Never nest glass surfaces—`utils.css` contains a guard (`.glass .glass{background:transparent!important}`) that automatically neutralises accidental second-level surfaces.

## Navbar Search Bar

The top navbar contains a search input that shares some visual characteristics with other inputs but has specific layout considerations due to its placement in the global header.

**Layout and Sizing:**
- The navbar search bar is designed to occupy the central, available horizontal space in the navbar.
- It is horizontally centered within the navbar.
- Its maximum width is constrained to `max-w-5xl` (1024px), similar to the advisor chat input, to maintain a comfortable reading line for search results and consistency in wide-input scenarios.
- On desktop screens (`md` and larger), the input field takes the full width of this container.
- On smaller screens, a search icon is displayed, which, when clicked, opens a full-width search input in a sheet overlay.

**Styling:**
- The navbar uses a glassmorphic/dark background. To ensure readability, its search input placeholder needs to be much lighter than standard input placeholders.
- To achieve this, the `<Input>` component for the navbar search (both desktop and mobile sheet versions) uses the shared class `unified-search-input` along with specific Tailwind placeholder utilities:

```tsx
// Example for Navbar.tsx (desktop search and mobile sheet search):
className="unified-search-input placeholder:text-[#F0F0F0] placeholder:opacity-75 ...other_classes..."
```

This combination ensures the correct placeholder color (`#F0F0F0`) and opacity (`0.75`) for the navbar search input, distinguishing it from other inputs in the application that might be on lighter backgrounds.

# Foresight Frontend Styling Guide

## Layout & Scrolling Patterns (2024 Refactor)

### Main View Structure
- Each main view (Dashboard, Patients, Alerts, Analytics, Settings, Advisor) is wrapped in a `ContentSurface` component.
- The `ContentSurface` provides a frosted-glass effect and consistent padding.
- **Do not** wrap main view content in a `Card`—this avoids extra padding, rounded corners, and background clashes at the screen edge.
- Scrolling is handled by an inner `<div className="flex-1 min-h-0 overflow-y-auto">` placed directly inside `ContentSurface`.
- The page itself (`html`, `body`) uses `overflow: hidden` so only the inner container scrolls.

#### Example (Patients List View)
```tsx
<ContentSurface>
  <h1 className="text-xl font-semibold mb-2">Patients</h1>
  <p className="mb-4 text-muted-foreground">Browse and search all patients in the system.</p>
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* Table or list content here */}
  </div>
</ContentSurface>
```

### Full-Bleed Views
- For views that need to opt out of the glass effect (e.g., PatientWorkspaceView), pass `fullBleed` to `ContentSurface`.

### Advisor Chat
- The chat input/footer is rendered via a React portal into `document.body` to ensure it is always anchored to the bottom of the viewport.
- The chat area itself uses the same scrollable pattern as above.

## Component Usage
- Use Tailwind utility classes for layout, spacing, and overflow.
- Avoid unnecessary wrapper divs—keep the DOM shallow for main views.
- Only use `Card` for content that should be visually separated from the main background (e.g., modals, popovers, or secondary panels).

## Visual Consistency
- The frosted glass effect is achieved with `bg-glass` and `backdrop-blur` classes. Key layout elements like the header and sidebar utilize this "glassmorphism" effect, typically achieved with CSS `backdrop-filter: blur()` and semi-transparent backgrounds. Specific classes for this (e.g., `bg-glass`) should be consistently applied.
- Main content should always align with the padding and spacing provided by `ContentSurface`.

## Typography
- (Details to be filled in if a specific typography scale is defined, e.g., from Tailwind config or global CSS. Currently, `font-sans` (Manrope) is the base, and `text-step--1` is used for smaller input-like text.)

## Accessibility & Responsiveness
- Use semantic HTML for headings and sections.
- Ensure scrollable containers have appropriate keyboard and screen reader support.
- Standard accessibility practices (semantic HTML, ARIA attributes where necessary) should be followed.
- Components should be designed to adapt to various screen sizes, primarily using Tailwind CSS's responsive prefixes (sm, md, lg, xl).
- Use Tailwind's responsive classes for layout adjustments on different screen sizes.

# UI Library Policy and Scroll Area Usage

The Foresight CDSS frontend uses a **mixed approach** for UI components:

- **Radix UI**: Most generic UI primitives (buttons, dialogs, tooltips, dropdowns, selects, checkboxes, etc.) in `src/components/ui/` are built on top of Radix UI primitives (following the Shadcn UI pattern). This ensures accessibility and composability for interactive elements.
- **Native Browser Elements**: For layout, scrolling, and most container elements, we prefer native browser elements styled with Tailwind CSS and global CSS. All main content scroll areas use native browser scrolling (e.g., `<div className="flex-1 min-h-0 overflow-y-auto">`).
- **Radix ScrollArea**: The Radix-based `ScrollArea` component exists in `src/components/ui/scroll-area.tsx` and should **only be used when strictly necessary** (e.g., for custom scrollbars or advanced scroll event handling not possible with native scroll). If you use it, document the reason in the component.
- **Other Libraries**: As of this writing, no other major UI component libraries are in use. If this changes, update this section.

**Policy:**
- By default, use native browser scroll areas for all main content and panels. This ensures consistent styling and avoids complexity.
- Only use Radix ScrollArea if you have a clear, documented need.

See [docs/architecture.md](architecture.md#ui-library-usage-and-scroll-area-policy) for rationale and more details.

## Standardized Component Styling

### Dropdown and Select Menus

To ensure a consistent look and feel across the application, all dropdown menus (`DropdownMenuContent` from `src/components/ui/dropdown-menu.tsx`) and select menus (`SelectContent` from `src/components/ui/select.tsx`) are styled to match the appearance of the navbar search results panel.

**Styling:**
- **Background and Blur:** `backdrop-blur-lg bg-[rgba(255,255,255,0.1)]`
- **Border:** `border-[rgba(255,255,255,0.12)]` (Note: The original components already have a border, this specific class ensures the color matches the navbar's panel).

These styles provide a glassmorphic effect consistent with other key UI elements like the navbar and sidebars. The size of the dropdown/select panel will vary based on its content and specific implementation context, but the visual treatment (blur, background color, border) is standardized.

# Frontend Styling Guide

This document provides guidelines and conventions for styling frontend components in the Foresight CDSS MVP project.

## Core Principles

- **Consistency:** Strive for a consistent visual language across the application.
- **Clarity:** Ensure that UI elements are clear, readable, and intuitive.
- **Responsiveness:** Design components to adapt gracefully to different screen sizes.
- **Accessibility:** Adhere to accessibility best practices (WCAG AA as a minimum target).

## Technologies

- **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
- **Radix UI (Headless Components):** For accessible and unstyled primitives for UI components like dropdowns, dialogs, etc. (if used).
- **Lucide Icons:** For clear and consistent iconography.

## General Guidelines

- **Theme:** Adhere to the project's color palette, typography, and spacing scales defined in `tailwind.config.js`.
- **Component-Based Styling:** Styles should generally be co-located with their components or defined within global styles if they are truly universal.
- **Utility Classes:** Prefer Tailwind's utility classes for most styling needs. Use custom CSS sparingly and only when necessary (e.g., for complex animations or very specific selectors not easily achieved with utilities).
- **Dark Mode:** (If applicable) Ensure components are styled for a seamless experience in both light and dark modes.

## Specific Component Styling Notes

### Advisor Chat & Streaming Markdown

- **Markdown Container:** Assistant messages containing streamed Markdown are rendered into a `div` within the `AssistantMessageRenderer` component. This `div` is given the Tailwind CSS class `prose` (and `prose-sm max-w-none`) by default in `AssistantMessageRenderer`.
- **`prose` Styling:** The `prose` class from `@tailwindcss/typography` provides sensible defaults for rendering HTML generated from Markdown (headings, paragraphs, lists, blockquotes, code blocks, tables, etc.).
- **Customization:**
    - If further customization of Markdown elements is needed beyond what `prose` provides by default, these styles can be added either by extending the `prose` theme in `tailwind.config.js` or by targeting specific HTML elements within the `.prose` scope using global CSS.
    - For example, `h1`, `h2`, `p`, `ul`, `table` styles within the chat bubbles are primarily governed by the `prose` classes.
- **Code Blocks:** Code blocks within Markdown are typically rendered as `<pre><code>...</code></pre>`. The `prose` plugin styles these, but further syntax highlighting themes can be applied if desired (e.g., using a library like `highlight.js` and theming its output).
- **Tables:** Tables generated from Markdown will also be styled by `prose`. Ensure they are responsive and readable.

*(More specific component styling guidelines will be added as the UI evolves.)* 