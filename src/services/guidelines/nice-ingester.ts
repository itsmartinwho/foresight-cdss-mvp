import { BaseGuidelineIngester, IngestionResult } from './base-ingester';
import { Specialty } from '@/types/guidelines';

export class NICEIngester extends BaseGuidelineIngester {
  constructor() {
    super('NICE');
  }

  isConfigured(): boolean {
    return true; // Using static data for initial implementation
  }

  async ingest(): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    await this.logIngestion('started', 'Starting NICE ingestion with clinical guidelines');

    try {
      console.log('Starting NICE guidelines ingestion...');
      
      // Real NICE guidelines data from nice.org.uk
      const niceGuidelines = [
        {
          title: 'Type 2 diabetes in adults: management',
          content: `This guideline covers the care and management of type 2 diabetes in adults (aged 18 and over). It focuses on patient education, dietary advice, managing cardiovascular risk, managing blood glucose levels, and identifying and managing long-term complications.

KEY RECOMMENDATIONS:
- Offer structured education to all adults with type 2 diabetes at diagnosis
- Support people to maintain their HbA1c level below their agreed threshold (usually 48 mmol/mol or 53 mmol/mol)
- Offer metformin modified release if standard metformin causes gastrointestinal side effects
- Consider dual therapy if HbA1c rises to 58 mmol/mol or higher on lifestyle interventions and metformin

BLOOD GLUCOSE MANAGEMENT:
- First-line: Metformin (unless contraindicated)
- Second-line: Add DPP-4 inhibitor, pioglitazone, sulfonylurea, or SGLT-2 inhibitor
- Consider insulin-based treatment if triple therapy is not effective

CARDIOVASCULAR RISK:
- Offer ACE inhibitor or ARB for hypertension
- Consider statin therapy for primary prevention
- Assess cardiovascular risk annually

FOLLOW-UP:
- HbA1c every 3-6 months until stable, then every 6 months
- Annual review including complications screening

POPULATION: Adults with type 2 diabetes
NICE GUIDELINE: NG28 (Updated December 2022)`,
          specialty: 'Endocrinology' as Specialty,
          metadata: {
            guideline_id: 'nice-ng28-diabetes-type2',
            publication_date: '2022-12-14',
            last_reviewed: '2022-12-14',
            category: 'Clinical Management',
            author: 'National Institute for Health and Care Excellence',
            organization: 'NICE',
            reference: 'NG28',
            url: 'https://www.nice.org.uk/guidance/ng28'
          }
        },
        {
          title: 'Hypertension in adults: diagnosis and management',
          content: `This guideline covers identifying and treating primary hypertension (high blood pressure) in adults aged 18 and over. It aims to reduce the risk of cardiovascular problems such as heart attacks and strokes by helping healthcare professionals to diagnose hypertension accurately and treat it effectively.

DIAGNOSIS:
- Use clinic blood pressure measurement to diagnose hypertension
- If clinic BP 140/90 mmHg or higher, offer ambulatory blood pressure monitoring (ABPM)
- If ABPM not available, offer home blood pressure monitoring (HBPM)
- Hypertension diagnosed if ABPM/HBPM average ≥135/85 mmHg

CLASSIFICATION:
- Stage 1: Clinic BP 140/90 to 159/99 mmHg and ABPM/HBPM 135/85 to 149/94 mmHg
- Stage 2: Clinic BP 160/100 to 179/109 mmHg and ABPM/HBPM 150/95 to 164/104 mmHg
- Stage 3: Clinic BP 180/110 mmHg or higher

TREATMENT THRESHOLDS:
- Stage 1: Offer treatment if <80 years with cardiovascular disease, target organ damage, diabetes, or 10-year cardiovascular risk ≥10%
- Stage 2: Offer treatment to all patients regardless of age

DRUG TREATMENT:
- Step 1: ACE inhibitor or ARB (or CCB if Afro-Caribbean or >55 years)
- Step 2: ACE inhibitor/ARB + CCB or thiazide-like diuretic
- Step 3: ACE inhibitor/ARB + CCB + thiazide-like diuretic
- Step 4: Add spironolactone or increase thiazide-like diuretic

TARGET BP: <140/90 mmHg (or <130/80 mmHg if diabetes or cardiovascular disease)

POPULATION: Adults aged 18 and over with hypertension
NICE GUIDELINE: NG136 (Updated August 2019)`,
          specialty: 'Cardiology' as Specialty,
          metadata: {
            guideline_id: 'nice-ng136-hypertension',
            publication_date: '2019-08-28',
            last_reviewed: '2019-08-28',
            category: 'Clinical Management',
            author: 'National Institute for Health and Care Excellence',
            organization: 'NICE',
            reference: 'NG136',
            url: 'https://www.nice.org.uk/guidance/ng136'
          }
        },
        {
          title: 'Depression in adults: treatment and management',
          content: `This guideline covers identifying, treating and managing depression in people aged 18 and over. It aims to improve care for people with depression by promoting improved recognition and treatment.

ASSESSMENT:
- Use validated questionnaires (PHQ-9, HADS, BDI-II)
- Consider severity: subthreshold, mild, moderate, severe
- Assess suicide risk and psychotic symptoms
- Consider comorbidities and social circumstances

TREATMENT OPTIONS:
Subthreshold/Mild Depression:
- Guided self-help
- Computerised CBT
- Group-based peer support
- Group exercise programme

Moderate to Severe Depression:
- Individual CBT
- IPT (Interpersonal therapy)
- Behavioural activation
- Behavioural couples therapy

ANTIDEPRESSANT MEDICATION:
- First-line: SSRI (consider sertraline)
- If SSRI not effective: switch to another SSRI or SNRI
- Consider mirtazapine or tricyclic if other options unsuccessful
- Monitor closely in first 4 weeks, especially under 30 years

COMBINATION TREATMENT:
- Consider combined CBT and antidepressant for moderate-severe depression
- Recommended for recurrent depression or comorbidities

FOLLOW-UP:
- Review within 2 weeks of starting treatment
- Monitor for 6 months after remission
- Plan relapse prevention strategies

POPULATION: Adults aged 18 and over with depression
NICE GUIDELINE: NG222 (Updated June 2022)`,
          specialty: 'Mental Health Conditions and Substance Abuse' as Specialty,
          metadata: {
            guideline_id: 'nice-ng222-depression-adults',
            publication_date: '2022-06-29',
            last_reviewed: '2022-06-29',
            category: 'Clinical Management',
            author: 'National Institute for Health and Care Excellence',
            organization: 'NICE',
            reference: 'NG222',
            url: 'https://www.nice.org.uk/guidance/ng222'
          }
        },
        {
          title: 'Suspected cancer: recognition and referral',
          content: `This guideline covers the recognition and referral of adults, children and young people with suspected cancer. It aims to help identify people with different types of cancer earlier by improving the recognition of signs and symptoms and making the best use of diagnostic tests.

RED FLAG SYMPTOMS REQUIRING URGENT REFERRAL:

Colorectal Cancer:
- Rectal bleeding + change in bowel habit (>40 years)
- Iron deficiency anaemia + change in bowel habit (>60 years)
- Palpable rectal mass
- Unexplained weight loss + abdominal pain (>40 years)

Lung Cancer:
- Chest X-ray suggestive of lung cancer
- Persistent or recurrent chest infection (>40 years)
- Persistent haemoptysis (>40 years)
- Unexplained weight loss + cough (>40 years)

Breast Cancer:
- Unilateral breast lump in women >30 years
- Breast lump in men >50 years
- Unilateral nipple discharge (>50 years)
- Skin changes suggestive of breast cancer

Upper GI Cancer:
- Dysphagia (any age)
- Upper abdominal mass (>55 years)
- Reflux + dyspepsia + weight loss (>55 years)
- Nausea/vomiting + dyspepsia + weight loss (>55 years)

URGENT REFERRAL TIMELINES:
- Two-week wait referral for suspected cancer
- Arrange urgent direct access investigations when appropriate
- Safety net with follow-up appointments

POPULATION: Adults, children and young people with suspected cancer
NICE GUIDELINE: NG12 (Updated June 2015)`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'nice-ng12-suspected-cancer',
            publication_date: '2015-06-23',
            last_reviewed: '2015-06-23',
            category: 'Recognition and Referral',
            author: 'National Institute for Health and Care Excellence',
            organization: 'NICE',
            reference: 'NG12',
            url: 'https://www.nice.org.uk/guidance/ng12'
          }
        },
        {
          title: 'Atrial fibrillation: diagnosis and management',
          content: `This guideline covers diagnosing and managing atrial fibrillation in adults. It includes guidance on providing the best care and treatment for people with atrial fibrillation, including assessing stroke risk and selecting appropriate anticoagulation.

DIAGNOSIS:
- ECG to confirm AF diagnosis
- Consider echocardiogram for structural heart disease
- Thyroid function tests
- Consider Holter monitoring for paroxysmal AF

STROKE RISK ASSESSMENT:
- Use CHA2DS2-VASc score for stroke risk
- CHA2DS2-VASc ≥2 (men) or ≥3 (women): consider anticoagulation
- Consider bleeding risk using HAS-BLED score

ANTICOAGULATION:
First-line options (if no contraindications):
- Apixaban, Dabigatran, Edoxaban, or Rivaroxaban (DOACs)
- Warfarin if DOAC contraindicated or not suitable

RATE CONTROL:
- First-line: Beta-blocker or rate-limiting calcium channel blocker
- If monotherapy inadequate: combination therapy
- Consider digoxin if beta-blocker and calcium channel blocker contraindicated

RHYTHM CONTROL:
- Consider if symptoms persist despite rate control
- First-line: Flecainide or propafenone (if no structural heart disease)
- Amiodarone if structural heart disease present
- Consider cardioversion for recent-onset AF

LIFESTYLE ADVICE:
- Alcohol moderation
- Weight management
- Treatment of sleep apnoea
- Blood pressure control

POPULATION: Adults with atrial fibrillation
NICE GUIDELINE: NG196 (Updated April 2021)`,
          specialty: 'Cardiology' as Specialty,
          metadata: {
            guideline_id: 'nice-ng196-atrial-fibrillation',
            publication_date: '2021-04-21',
            last_reviewed: '2021-04-21',
            category: 'Clinical Management',
            author: 'National Institute for Health and Care Excellence',
            organization: 'NICE',
            reference: 'NG196',
            url: 'https://www.nice.org.uk/guidance/ng196'
          }
        }
      ];

      // Process each guideline
      for (const guideline of niceGuidelines) {
        try {
          const docId = await this.saveGuideline(
            guideline.title,
            guideline.content,
            guideline.specialty,
            guideline.metadata
          );

          if (docId) {
            result.documentsProcessed++;
            result.documentsUpdated++;
            console.log(`Processed NICE guideline: ${guideline.title}`);
          } else {
            result.errors.push(`Failed to save guideline: ${guideline.title}`);
          }
        } catch (error) {
          const errorMsg = `Error processing guideline ${guideline.title}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      
      if (result.success) {
        await this.logIngestion('completed', `Successfully processed ${result.documentsUpdated} NICE guidelines`, result.documentsUpdated);
      } else {
        await this.logIngestion('failed', `Failed with ${result.errors.length} errors`, result.documentsUpdated);
      }

      console.log(`Completed NICE: processed ${result.documentsProcessed}, updated ${result.documentsUpdated}`);
      
    } catch (error) {
      result.errors.push(`NICE ingestion failed: ${error}`);
      await this.logIngestion('failed', `Critical error: ${error}`);
    }

    return result;
  }
} 