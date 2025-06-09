import { BaseGuidelineIngester, IngestionResult } from './base-ingester';
import { Specialty } from '@/types/guidelines';

export class USPSTFIngester extends BaseGuidelineIngester {
  constructor() {
    super('USPSTF');
  }

  isConfigured(): boolean {
    return true; // Using static data, no API key needed
  }

  async ingest(): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    await this.logIngestion('started', 'Starting USPSTF ingestion with real data');

    try {
      console.log('Starting USPSTF guidelines ingestion...');
      
      // Real USPSTF guidelines data from uspreventiveservicestaskforce.org
      const realGuidelines = [
        {
          title: 'Syphilis Infection During Pregnancy: Screening',
          content: `The USPSTF recommends early, universal screening for syphilis infection during pregnancy; if an individual is not screened early in pregnancy, the USPSTF recommends screening at the first available opportunity.

IMPLEMENTATION:
- Perform screening as early in pregnancy as possible, when a pregnant patient first presents to care
- If early screening was not done, screening should occur at the first opportunity, even if that is at presentation for delivery
- Screening should include both a treponemal and nontreponemal test

RATIONALE:
- Untreated syphilis infection during pregnancy can be passed to the fetus, causing congenital syphilis
- Congenital syphilis is associated with premature birth, low birth weight, stillbirth, neonatal death, and significant abnormalities in the infant
- In 2023, there were 3882 cases of congenital syphilis in the US, including 279 congenital syphilis-related stillbirths and neonatal/infant deaths

POPULATION: Asymptomatic pregnant women
GRADE: A (High certainty that the net benefit is substantial)`,
          specialty: 'Obstetric and Gynecologic Conditions' as Specialty,
          metadata: {
            guideline_id: 'uspstf-syphilis-pregnancy-2025',
            publication_date: '2025-05-13',
            last_reviewed: '2025-05-13',
            category: 'Screening',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'A'
          }
        },
        {
          title: 'Breastfeeding: Primary Care Behavioral Counseling Interventions',
          content: `The USPSTF recommends that primary care clinicians provide interventions during pregnancy and after birth to support breastfeeding.

IMPLEMENTATION:
- Provide education and counseling about breastfeeding benefits
- Offer practical support during pregnancy and postpartum period
- Coordinate with lactation consultants and support groups
- Address common barriers to successful breastfeeding

RATIONALE:
- Breastfeeding provides important health benefits for both infants and mothers
- Primary care interventions can significantly increase breastfeeding initiation and duration
- Evidence shows behavioral counseling interventions are effective in promoting breastfeeding

POPULATION: Pregnant and postpartum women
GRADE: B (High certainty that the net benefit is moderate)`,
          specialty: 'Primary Care' as Specialty,
          metadata: {
            guideline_id: 'uspstf-breastfeeding-2025',
            publication_date: '2025-04-01',
            last_reviewed: '2025-04-01',
            category: 'Behavioral Counseling',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'B'
          }
        },
        {
          title: 'Food Insecurity: Screening',
          content: `The USPSTF concludes that the current evidence is insufficient to assess the balance of benefits and harms of screening for food insecurity in adults.

RATIONALE:
- Food insecurity is associated with poor health outcomes
- Limited evidence on the effectiveness of screening in primary care settings
- More research needed on screening tools and interventions

CLINICAL CONSIDERATIONS:
- Clinicians may consider asking about food access as part of social determinants assessment
- Resources for food assistance should be available if screening is conducted
- Consider community partnerships for comprehensive support

POPULATION: Adults in primary care settings
GRADE: I (Insufficient evidence)`,
          specialty: 'Primary Care' as Specialty,
          metadata: {
            guideline_id: 'uspstf-food-insecurity-2025',
            publication_date: '2025-03-01',
            last_reviewed: '2025-03-01',
            category: 'Screening',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'I'
          }
        },
        {
          title: 'Colorectal Cancer: Screening',
          content: `The USPSTF recommends screening for colorectal cancer in adults aged 45 to 75 years.

SCREENING METHODS:
- Colonoscopy every 10 years
- Flexible sigmoidoscopy every 5 years plus FIT every year
- CT colonography every 5 years
- Fecal immunochemical test (FIT) annually
- Guaiac-based fecal occult blood test annually
- Multitarget stool DNA test every 1-3 years

IMPLEMENTATION:
- Begin screening at age 45 for average-risk adults
- Continue screening through age 75
- For ages 76-85, individualize decision based on patient factors
- Ensure adequate follow-up for abnormal results

POPULATION: Adults aged 45-75 years
GRADE: A (High certainty that the net benefit is substantial)`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'uspstf-colorectal-cancer-2021',
            publication_date: '2021-05-18',
            last_reviewed: '2021-05-18',
            category: 'Cancer Screening',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'A'
          }
        },
        {
          title: 'Hypertension in Adults: Screening',
          content: `The USPSTF recommends screening for high blood pressure in adults 18 years or older. The USPSTF recommends obtaining measurements outside of the clinical setting for diagnostic confirmation before starting treatment.

IMPLEMENTATION:
- Screen all adults aged 18 years or older
- Use proper technique and validated equipment
- Obtain multiple measurements on separate occasions
- Confirm diagnosis with ambulatory or home blood pressure monitoring
- Screen at least every 2 years if normal (<120/80 mmHg)
- Screen annually if elevated (120-129/<80) or stage 1 hypertension

BLOOD PRESSURE CATEGORIES:
- Normal: <120/80 mmHg
- Elevated: 120-129/<80 mmHg
- Stage 1: 130-139/80-89 mmHg
- Stage 2: ≥140/90 mmHg

POPULATION: Adults aged 18 years or older
GRADE: A (High certainty that the net benefit is substantial)`,
          specialty: 'Cardiology' as Specialty,
          metadata: {
            guideline_id: 'uspstf-hypertension-2021',
            publication_date: '2021-04-27',
            last_reviewed: '2021-04-27',
            category: 'Screening',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'A'
          }
        },
        {
          title: 'Depression in Adults: Screening',
          content: `The USPSTF recommends screening for depression in the general adult population, including pregnant and postpartum women. Screening should be implemented with adequate systems in place to ensure accurate diagnosis, effective treatment, and appropriate follow-up.

IMPLEMENTATION:
- Use validated screening instruments (PHQ-2, PHQ-9, etc.)
- Ensure systems are in place for diagnosis, treatment, and follow-up
- Screen all adults including pregnant and postpartum women
- Consider screening more frequently for high-risk populations

SCREENING TOOLS:
- Patient Health Questionnaire-2 (PHQ-2) for initial screening
- Patient Health Questionnaire-9 (PHQ-9) for detailed assessment
- Other validated tools as appropriate

POPULATION: General adult population, including pregnant and postpartum women
GRADE: B (High certainty that the net benefit is moderate)`,
          specialty: 'Mental Health Conditions and Substance Abuse' as Specialty,
          metadata: {
            guideline_id: 'uspstf-depression-adults-2016',
            publication_date: '2016-01-26',
            last_reviewed: '2016-01-26',
            category: 'Screening',
            author: 'US Preventive Services Task Force',
            organization: 'USPSTF',
            grade: 'B'
          }
        }
      ];

      for (const guideline of realGuidelines) {
        try {
          const docId = await this.saveGuideline(
            guideline.title,
            guideline.content,
            guideline.specialty,
            guideline.metadata
          );

          result.documentsProcessed++;
          if (docId) {
            result.documentsUpdated++;
          }
          console.log(`Processed USPSTF guideline: ${guideline.title}`);
        } catch (error) {
          const errorMsg = `Error processing USPSTF guideline "${guideline.title}": ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      const message = `Processed ${result.documentsProcessed} guidelines, updated ${result.documentsUpdated}`;
      await this.logIngestion(
        result.success ? 'completed' : 'failed',
        message,
        result.documentsUpdated
      );

    } catch (error) {
      const errorMsg = `Error during USPSTF ingestion: ${error}`;
      result.errors.push(errorMsg);
      await this.logIngestion('failed', errorMsg);
    }

    return result;
  }
} 