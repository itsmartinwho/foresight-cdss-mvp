# PRD: Differential Diagnoses in Patient Workspaces

## 1. Introduction/Overview
This document outlines the requirements for a new "Differential Diagnoses" section within the patient workspaces. This feature will display a list of all potential diagnoses for a given patient encounter, as recorded in the database. The primary goal is to provide a comprehensive view of diagnostic possibilities and to allow clinicians to directly manage this information in-place. The feature will be located below the existing primary diagnosis section and will include functionality for adding, editing, and deleting diagnoses.

## 2. Goals
- To provide clinicians with a comprehensive, auditable view of all potential diagnoses for a specific encounter.
- To improve clinical workflow by allowing users to directly add, edit, and delete differential diagnoses from the patient workspace.
- To ensure data integrity by providing a clean, intuitive editing UI that enforces correct data formats for each field.
- To dynamically reflect the clinical assessment by automatically re-sorting the diagnosis list based on user-edited probabilities.

## 3. User Stories
- **As a doctor,** I want to see a list of all differential diagnoses for my patient's current encounter so that I can consider all possibilities in my clinical assessment.
- **As a clinical supervisor,** I want to review the differential diagnoses suggested by the system to audit the quality of care and provide feedback.
- **As a clinician,** I want to edit the probability of a differential diagnosis so that the list re-orders to reflect my clinical judgment.
- **As a clinician,** I want to add a new diagnosis to the differential list if I identify a possibility the system missed.
- **As a clinician,** I want to delete a diagnosis from the list if I have ruled it out.

## 4. Functional Requirements
1.  A new UI section titled **"Differential Diagnoses"** shall be added to the patient workspace, located directly below the "Diagnosis" (primary diagnosis) section.
2.  The section will fetch and display all differential diagnoses associated with the current patient encounter from the Supabase database.
3.  Each differential diagnosis shall be displayed as a card, consistent with the UI of consultation modals. All available data fields for the diagnosis must be displayed by default.
4.  If no differential diagnoses are found for the encounter, the section will display the message: "No differential diagnoses recorded for this consultation".
5.  The list of differential diagnoses will be sorted in descending order based on their probability. If probabilities are equal, the subsequent order is not critical.
6.  All data fields for a differential diagnosis will be **editable in-place**. The editing UI should be clean and subtle.
7.  Input fields must enforce the correct data type for the corresponding database field:
    7.1. **Date fields** must use a date selector widget.
    7.2. **Probability fields** must accept only numbers, and a non-editable "%" symbol must be displayed next to the input.
8.  Next to each editable field, the following controls must be present as icons:
    8.1. **Undo:** Reverts the last change to the field.
    8.2. **Redo:** Re-applies the last undone change to the field.
    8.3. **Save:** Commits the current state of the diagnosis (all its fields) to the database.
    8.4. **Delete:** Removes the entire differential diagnosis entry from the database and the UI.
9.  After a user saves an edit to a probability field, the entire list of differential diagnoses must automatically re-sort based on the new probabilities.
10. The UI must include a mechanism (e.g., an "Add Diagnosis" button) to allow users to add a new differential diagnosis to the list for the current encounter.

## 5. Non-Goals (Out of Scope)
- This feature will not involve building or modifying the clinical engine logic that generates the initial differential diagnoses. It only displays and manages existing data.
- Individual diagnosis cards will not have expand/collapse functionality. All details will be shown by default.
- Manual drag-and-drop reordering of the list is not required. Sorting is handled automatically by probability.

## 6. Design Considerations
- The UI for displaying differential diagnoses should use a **card-based layout**, consistent with the style of existing consultation modals.
- The editing interface should be integrated cleanly into the cards, appearing on hover or click to maintain a clean default view.
- Icons for undo, redo, save, and delete should be universally recognizable (e.g., using standard icon libraries) and have helpful tooltips.
- The experience of adding a new diagnosis should be seamless, for example, by adding a new blank card with input fields.

## 7. Technical Considerations
- The feature requires real-time read and write access to the differential diagnoses table in the Supabase database.
- Client-side state management must handle UI updates efficiently as data is edited, saved, or deleted, ensuring the UI always reflects the database state.
- The sorting logic must be robust and re-run automatically after any change to a diagnosis's probability.
- Form validation should be implemented to prevent saving data in an incorrect format.

## 8. Success Metrics
- Feature adoption, measured by the number of interactions (edits, additions, deletions) with the differential diagnoses list.
- User satisfaction, measured via qualitative feedback from clinicians on the feature's utility and ease of use.

## 9. Open Questions
- What is the precise UI/UX for adding a *new* differential diagnosis? Does a blank card appear at the top/bottom of the list, or does a separate modal form open?
- How is the primary diagnosis for the encounter determined? Should we ensure it is filtered out from this differential diagnoses list to avoid duplication? 