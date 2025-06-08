# Testing in Foresight CDSS

This document provides an overview of the different types of tests available in the Foresight Clinical Decision Support System (CDSS) project and how to run them.

## Main Test Command

To run all available automated tests (Frontend, E2E, and Python), use the following command:

```bash
npm run test
```

This command executes the tests sequentially.

## Test Types

### 1. Frontend Unit & Integration Tests (Vitest)

*   **Coverage:** These tests cover the frontend application's utilities, hooks, services, and individual component logic. They ensure that smaller pieces of the frontend code work as expected in isolation (unit tests) or in combination (integration tests).
*   **Technology:** [Vitest](https://vitest.dev/)
*   **Location:** `tests/frontend/`
*   **How to run:**
    ```bash
    npm run test:unit
    ```

### 2. End-to-End Tests (Playwright)

*   **Coverage:** These tests simulate real user flows through the application's UI. They verify that critical paths and user interactions work correctly from the user's perspective.
*   **Technology:** [Playwright](https://playwright.dev/)
*   **Location:** `tests/e2e.spec.ts` (Configuration: `tests/playwright.config.ts`)
*   **How to run:**
    ```bash
    npm run test:e2e
    ```

### 3. Python Tests (Pytest)

*   **Coverage:** These tests focus on the Python-based components of the system, specifically the clinical engine prototype.
*   **Technology:** [Pytest](https://docs.pytest.org/)
*   **Location:** `tests/test_clinical_engine.py`
*   **How to run:**
    ```bash
    npm run test:py
    ```
    *(Note: Ensure you have `pytest` installed and your Python environment configured if running this command manually outside of a dev container or CI environment that handles setup.)*

### 4. Component Tests & Visualization (Storybook)

*   **Coverage:** Storybook allows for isolated development, visualization, and interaction testing of UI components. While not part of the `npm run test` suite, it's a crucial tool for developing and verifying component behavior and appearance. Many stories also include interaction tests (`play` functions).
*   **Technology:** [Storybook](https://storybook.js.org/)
*   **Location:** `tests/stories/` (Configuration: `tests/.storybook/`)
*   **How to run:**
    ```bash
    npm run storybook
    ```

## Manual Testing Guidelines

### Differential Diagnoses Scrollability Test

**Purpose**: Verify that the differential diagnoses list is properly scrollable within the ConsultationPanel modal.

**Test Steps**:
1. Open the application and navigate to a patient
2. Start a new consultation or open an existing consultation with generated clinical plan
3. Switch to the "Differentials" tab in the consultation modal
4. Verify that if there are 5 differential diagnoses:
   - All cards are rendered and accessible
   - The header ("Differential Diagnoses" + count) remains fixed at top
   - The list is vertically scrollable using mouse wheel or scrollbar
   - All 5 cards can be accessed through scrolling
   - Scrollbar appears only when content exceeds container height
   - Footer (if present) remains fixed at bottom

**Expected Result**: 
- All differential diagnosis cards accessible through smooth vertical scrolling
- Fixed header and footer with scrollable content area
- Native browser scrolling behavior (invisible scrollbar that appears on hover)

**Test Scenarios**:
- Test with 1, 3, and 5 diagnosis cards to verify layout adapts properly
- Test on different screen sizes (13-inch primary target)
- Test in demo mode to ensure scrolling works when editing is disabled

**Last Verified**: December 2024 - Implementation completed

---

Regularly running these tests helps maintain code quality and ensures the stability of the application.
