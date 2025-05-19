# Frontend Styling Guide: Input and Placeholder Consistency

This guide outlines the strategy and conventions used in the Foresight CDSS project to ensure consistent styling for input fields, their placeholder text, and selected values, particularly within modals and forms.

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

# Frontend Styling Guide: Outer Layout & Containers

## ContentSurface – the single frosted-glass wrapper (2025-05 refactor)

All route-level pages must render their contents inside exactly one `<ContentSurface>` component which lives at `src/components/layout/ContentSurface.tsx`.

• **Default**: a frosted-glass div with `rounded-2xl`, internal padding `p-6`, and a max-width of 80 rem (≈1280 px).
• **fullBleed**: pass `fullBleed` when the view needs the entire viewport (e.g. complex workspaces). This renders a plain flex column without glass styling.

Never nest glass surfaces—`utils.css` contains a guard (`.glass .glass{background:transparent!important}`) that automatically neutralises accidental second-level surfaces.

## Exception: Lighter Placeholder in Sidebar and Navbar Search

The sidebar and top navbar use a glassmorphic/dark background, so their search input placeholders need to be much lighter for readability. This is achieved by:

- Adding a unique class (`sidebar-search-input` or `navbar-search-input`) to the relevant `<Input>` fields in the sidebar and navbar.
- Overriding the placeholder color for these classes in `globals.css`:

```css
.sidebar-search-input::placeholder,
.navbar-search-input::placeholder {
  color: #fff !important;
  opacity: 0.85 !important;
}
```

This ensures only the sidebar and navbar search placeholders are lighter, while all other input placeholders retain the standard color for forms and modals. 