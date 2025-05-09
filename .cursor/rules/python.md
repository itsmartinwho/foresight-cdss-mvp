# Python Component – Clinical Decision Support Engine

This project ships with a standalone Python script, `clinical_engine.py`, which contains the core logic for the Clinical Decision Support Engine (CDSE). The script **is not executed automatically** by the Next.js frontend – integration is still manual (see below) – but it can be run independently for testing or development.

## Runtime & Dependencies

| Requirement | Minimum Version | Notes |
|-------------|-----------------|-------|
| Python      | **3.9**         | Uses type-hinting features and `asyncio` improvements available ≥ 3.9 |
| pydantic    |  **1.10**       | Data modelling (`BaseModel`) |

Install the dependency with pip (a virtual-env/venv is recommended):

```bash
python -m venv .venv
source .venv/bin/activate
pip install pydantic>=1.10
```

No other third-party libraries are required; everything else is part of the Python standard library.

## High-level Structure

`clinical_engine.py` exposes a `ClinicalEngine` class that offers the following **public coroutine API**:

- `load_patient_data(patient_data_dir: str)` – loads TSV data from the `data/` folder.
- `generate_diagnostic_plan(symptoms: list[str], patient_id: str | None)` → `DiagnosticPlan`.
- `execute_diagnostic_step(step: DiagnosticStep, patient_id: str | None)` → `DiagnosticStep`.
- `execute_diagnostic_plan(plan: DiagnosticPlan, patient_id: str | None, update_callback)`.
- `generate_diagnostic_result(symptoms, plan, sources)` → `DiagnosticResult`.
- `match_clinical_trials`, `generate_prior_authorization`, `generate_specialist_referral` helpers.

All domain objects (`Patient`, `Admission`, `LabResult`, `DiagnosticPlan`, …) are declared as **Pydantic models** for robust validation/serialization.

## Usage Examples

```python
import asyncio
from clinical_engine import ClinicalEngine

engine = ClinicalEngine(llm_client=None, guideline_client=None, clinical_trial_client=None)
engine.load_patient_data("data/100-patients")

async def main():
    plan = await engine.generate_diagnostic_plan(["fatigue", "joint pain"], patient_id="<uuid>")
    plan, sources = await engine.execute_diagnostic_plan(plan, patient_id="<uuid>")
    result = await engine.generate_diagnostic_result(["fatigue", "joint pain"], plan, sources)
    print(result.json(indent=2))

asyncio.run(main())
```

## Integrating with the Next.js Front-end

At the moment there is **no wired-up API endpoint** between the TypeScript frontend and the Python engine. You have three options:

1. **Run as a micro-service** – expose an HTTP API (FastAPI/Flask) around `ClinicalEngine` and call it from `src/lib/clinicalEngineService.ts` (recommended next step).
2. **Invoke via CLI** – shell out from Node using `child_process.spawn`.
3. **Reuse logic in TypeScript** – the current MVP duplicates a subset of the engine logic inside `src/lib/clinicalEngineService.ts` for offline demo purposes.

Until option 1 is implemented, the React application relies on a *mock* service (`src/lib/clinicalEngineService.ts`) that mirrors the Python behaviour in TypeScript.

## Data Files

Sample synthetic data lives in `data/100-patients/` (TSV format). `load_patient_data` expects this directory structure.

## Logging & Debugging

- The module configures a basic **INFO-level** logger (`foresight.clinical_engine`).
- A lightweight `DebugLogger` is included for step-by-step tracing; set `logger.setLevel("DEBUG")` to enable.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_PROCESSING_TIME_MINUTES` | `5` | Safety timeout |
| `MAX_SOURCES_PER_STEP`        | `10` | Source retrieval cap |
| `MAX_PARALLEL_PROCESSES`      | `5` | Concurrency limit |
| `ENABLE_SOURCE_VERIFICATION`  | `true` | Toggle source vetting |

## Status

The engine is **feature-complete for the MVP**, but integration work is still pending. Contributions welcome! 