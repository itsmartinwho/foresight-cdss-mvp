# Clinical Engine V3 - Enhanced GPT-Based Clinical Reasoning

## Overview

The Clinical Engine V3 represents a significant improvement over previous versions by implementing a multi-step GPT-based clinical reasoning process instead of simple keyword matching and rule-based logic.

## Current Implementation (V3)

### Multi-Step Clinical Reasoning Process

1. **Stage 1: Comprehensive Patient Data Loading**
   - Uses `supabaseDataService.getPatientData(patientId)` to load complete patient context
   - Includes demographics, medical history, encounters, lab results, conditions, and treatments
   - Provides full patient context rather than isolated data points

2. **Stage 2: Differential Diagnosis Generation (GPT-4.1)**
   - Model: `gpt-4.1-2025-04-14`
   - Prompt: "You are a US-based doctor tasked to create differential diagnoses based on the provided patient information and data from the latest encounter and rank them based on their likelihood"
   - Output: 3-5 ranked differential diagnoses with likelihood and key factors
   - Saved to database for auditability and display in diagnosis tab

3. **Stage 3: Primary Diagnosis and Treatment Plan (o4-mini)**
   - Model: `o4-mini-2025-04-16`
   - Prompt: "You are a US-based doctor tasked to create a diagnosis and treatment plan based on the provided patient information, data from the latest encounter, and differential diagnosis provided by another doctor"
   - Uses structured JSON output for consistent parsing
   - Considers all patient data and differential diagnoses from Stage 2

4. **Stage 4: Additional Clinical Field Extraction (o4-mini)**
   - Separate calls to extract specific fields:
     - `conditionsDescription`: Concise medical condition description
     - `conditionsCode`: Appropriate ICD-10 code
     - `EncountersReason_code`: CPT or ICD-10 encounter reason code
     - `EncountersReason_display_text`: Human-readable encounter reason

5. **Stage 5: SOAP Note Generation**
   - Automated generation based on transcript, patient data, and diagnosis
   - Structured format for clinical documentation

6. **Stage 6: Automated Document Generation**
   - Referral documents for specialist care when indicated
   - Prior authorization requests for specialty medications
   - Evidence-based triggers for when these are needed

7. **Stage 7: Database Persistence**
   - Primary diagnosis saved to `conditions` table
   - Differential diagnoses saved to `differential_diagnoses` table
   - SOAP notes and treatments updated in `encounters` table
   - Additional fields populated automatically

## Key Improvements Over V2

### Before (V2 - Keyword Matching)
```typescript
if (symptoms.includes('fever') && symptoms.includes('cough')) {
  primaryDx = { code: "J06.9", name: "Acute upper respiratory infection" };
}
```

### After (V3 - GPT-Based Reasoning)
```typescript
const differentialDiagnoses = await this.generateDifferentialDiagnoses(patientData, transcript);
const diagnosticResult = await this.generateDiagnosisAndTreatment(patientData, transcript, differentialDiagnoses);
```

## Benefits

1. **Clinical Accuracy**: Uses medical knowledge trained into GPT models instead of simple pattern matching
2. **Context Awareness**: Considers full patient history, not just current symptoms
3. **Structured Output**: Consistent JSON responses enable reliable UI integration
4. **Auditability**: All differential diagnoses and reasoning steps are saved
5. **Extensibility**: Easy to add new stages or modify prompts

## Future Enhancements (Roadmap)

### Near-term Improvements
- **Clinical Decision Trees**: Implement evidence-based diagnostic algorithms
- **Medical Guidelines Integration**: Connect to UpToDate, clinical practice guidelines
- **Enhanced Lab Analysis**: Sophisticated interpretation of lab values and trends
- **Drug Interaction Checking**: Real-time medication safety analysis

### Medium-term Goals
- **Probabilistic Reasoning**: Bayesian inference for diagnostic likelihood
- **Risk Factor Analysis**: Comprehensive patient risk stratification
- **Clinical Prediction Rules**: Integration of validated scoring systems (CHAD2S2-VASc, etc.)
- **Evidence Quality Scoring**: Confidence based on quality and quantity of evidence

### Long-term Vision
- **Continuous Learning**: Model fine-tuning based on clinical outcomes
- **Physician Feedback Loop**: Learning from physician overrides and corrections
- **Multi-modal Analysis**: Integration of imaging, pathology, and genomics data
- **Real-time Guidelines**: Dynamic updates based on latest medical evidence

## Configuration

### Environment Variables
```
OPENAI_API_KEY=your_openai_api_key_here
```

### GPT Model Specifications
- **Differential Diagnosis**: `gpt-4.1-2025-04-14` (GPT-4.1) - Enhanced reasoning capabilities
- **Primary Diagnosis**: `o4-mini-2025-04-16` - Fast, cost-effective for structured outputs
- **Field Extraction**: `o4-mini-2025-04-16` - Specialized single-field extraction

## Usage

```typescript
import { ClinicalEngineServiceV3 } from '@/lib/clinicalEngineServiceV3';

const engine = new ClinicalEngineServiceV3();
const result = await engine.runDiagnosticPipeline(patientId, encounterId, transcript);
```

## Performance Considerations

- **Parallel Processing**: Future versions could parallelize GPT calls where possible
- **Caching**: Consider caching patient data context between calls
- **Rate Limiting**: Implement appropriate OpenAI API rate limiting
- **Fallback Logic**: Graceful degradation when GPT services are unavailable

## Security & Privacy

- Patient data is transmitted to OpenAI for processing
- Ensure compliance with HIPAA and relevant privacy regulations
- Consider on-premises alternatives for highly sensitive environments
- Implement audit logging for all GPT interactions

## Testing Strategy

- **Unit Tests**: Test individual stages with mock patient data
- **Integration Tests**: End-to-end pipeline testing
- **Clinical Validation**: Physician review of diagnostic accuracy
- **Performance Testing**: Load testing with realistic patient volumes

## Migration from V2

The V3 engine is a complete rewrite and does not use any V2 code. To migrate:

1. Update API routes to use `ClinicalEngineServiceV3`
2. Ensure OpenAI API key is configured
3. Test with sample patient data
4. Monitor for any missing functionality from V2

Legacy services (V1, V2) can be deprecated once V3 is validated in production.