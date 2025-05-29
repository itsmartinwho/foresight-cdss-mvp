# AI Rule: Updating and Creating Tests

When modifying the codebase, adhere to the following guidelines for tests:

1.  **New Features:**
    *   Implement new tests covering the feature's functionality. Choose test types (unit, integration, E2E) appropriate for the scope of the feature.

2.  **Bug Fixes:**
    *   If a bug fix addresses a testing gap, add a new test case that specifically covers the scenario the bug presented.
    *   If existing tests covered the area but were insufficient, review and update them to be more comprehensive.

3.  **Refactoring:**
    *   Ensure all existing tests pass after refactoring.
    *   If the refactoring alters a module's public API or observable behavior that tests rely on, update those tests accordingly.
    *   If refactoring makes previously untested logic accessible, consider adding new tests for it.

4.  **Component/Logic Changes:**
    *   **UI Components (`src/components/`, Storybook):**
        *   Visual or prop changes: Update or add Storybook stories (`tests/stories/`).
        *   Internal logic changes: Update or add unit/integration tests (`tests/frontend/`).
    *   **Core Logic (e.g., `src/lib/`, `src/hooks/`, services):**
        *   Update or add unit/integration tests (`tests/frontend/unit` or `tests/frontend/integration`) to reflect changes.

5.  **Choosing Test Types (General Guidance):**
    *   **Unit Tests (Vitest):** For isolated functions, component logic, hooks, utils. Focus on individual units of work.
    *   **Integration Tests (Vitest):** For interactions between services, modules, or components that are not full user flows (e.g., testing a service that calls another, or a component that uses a hook and a service).
    *   **End-to-End Tests (Playwright):** For critical user flows and interactions through the UI.
    *   **Component/Storybook Tests:** For UI component appearance, props, and basic interactions in isolation.
    *   **Python Tests (Pytest):** For Python-specific backend logic or services (e.g., clinical engine).

6.  **Test Locations:**
    *   Place all new tests in their respective established directories:
        *   Frontend Unit: `tests/frontend/unit/`
        *   Frontend Integration: `tests/frontend/integration/`
        *   End-to-End: `tests/e2e.spec.ts` (or new files in `tests/` as appropriate for E2E structure)
        *   Storybook: `tests/stories/`
        *   Python: `tests/test_clinical_engine.py` (or new files in `tests/` as appropriate for Python test structure)

**Core Principle:** Tests should verify the correctness of changes, prevent regressions, and serve as documentation for the expected behavior of the system. Always aim for clear, concise, and maintainable tests.
