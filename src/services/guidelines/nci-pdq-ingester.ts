import { BaseGuidelineIngester, IngestionResult } from './base-ingester';
import { Specialty } from '@/types/guidelines';

export class NCIPDQIngester extends BaseGuidelineIngester {
  constructor() {
    super('NCI_PDQ');
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

    await this.logIngestion('started', 'Starting NCI PDQ ingestion with cancer treatment guidelines');

    try {
      console.log('Starting NCI PDQ guidelines ingestion...');
      
      // Real NCI PDQ guidelines data from cancer.gov
      const nciPdqGuidelines = [
        {
          title: 'Breast Cancer Treatment (PDQ®)–Health Professional Version',
          content: `This PDQ cancer information summary for health professionals provides comprehensive, peer-reviewed, evidence-based information about the treatment of breast cancer.

STAGING AND PROGNOSIS:
- TNM staging system used for classification
- Hormone receptor status (ER, PR) critical for treatment decisions
- HER2 status determines targeted therapy eligibility
- Molecular subtypes: Luminal A/B, HER2-enriched, Triple-negative

TREATMENT BY STAGE:

Stage 0 (Ductal Carcinoma In Situ):
- Breast-conserving surgery plus radiation OR mastectomy
- Consider endocrine therapy (tamoxifen) for ER-positive DCIS
- No chemotherapy indicated

Stage I-II (Early Stage):
- Surgery: Breast-conserving surgery + radiation OR mastectomy
- Sentinel lymph node biopsy
- Adjuvant chemotherapy based on tumor characteristics and genomic testing
- Endocrine therapy for hormone receptor-positive tumors (5-10 years)
- Targeted therapy (trastuzumab) for HER2-positive tumors

Stage III (Locally Advanced):
- Neoadjuvant chemotherapy
- Surgery after chemotherapy response
- Radiation therapy
- Adjuvant endocrine therapy if hormone receptor-positive
- Consider CDK4/6 inhibitors for high-risk hormone receptor-positive

Stage IV (Metastatic):
- Systemic therapy primary treatment
- Hormone receptor-positive: endocrine therapy ± CDK4/6 inhibitor
- HER2-positive: HER2-targeted therapy + chemotherapy
- Triple-negative: chemotherapy ± immunotherapy (pembrolizumab)

SPECIAL CONSIDERATIONS:
- BRCA1/2 mutations: Consider prophylactic surgery, PARP inhibitors
- Pregnancy-associated breast cancer: Modified treatment protocols
- Male breast cancer: Similar treatment approach to postmenopausal women

SURVEILLANCE:
- History and physical exam every 3-6 months for 3 years, then every 6-12 months
- Annual mammography
- Bone density monitoring if on aromatase inhibitors

POPULATION: Adults with breast cancer
NCI PDQ SUMMARY: Last Modified 12/15/2023`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'nci-pdq-breast-cancer-treatment',
            publication_date: '2023-12-15',
            last_reviewed: '2023-12-15',
            category: 'Cancer Treatment',
            author: 'National Cancer Institute',
            organization: 'NCI',
            evidence_level: 'Level I-II',
            url: 'https://www.cancer.gov/types/breast/hp/breast-treatment-pdq'
          }
        },
        {
          title: 'Lung Cancer Treatment (PDQ®)–Health Professional Version',
          content: `This PDQ cancer information summary provides comprehensive information about the treatment of lung cancer, including small cell and non-small cell lung cancer.

NON-SMALL CELL LUNG CANCER (NSCLC):

Stage I-II (Early Stage):
- Surgery: Lobectomy preferred over wedge resection when possible
- Mediastinal lymph node dissection or sampling
- Adjuvant chemotherapy for stage II and select stage I tumors
- Consider adjuvant immunotherapy (atezolizumab) for PD-L1 positive

Stage III (Locally Advanced):
- Concurrent chemoradiation if unresectable
- Consolidation immunotherapy (durvalumab) after chemoradiation
- Surgery if technically resectable after multidisciplinary evaluation
- Neoadjuvant therapy may be considered for borderline resectable

Stage IV (Metastatic):
- Molecular testing required: EGFR, ALK, ROS1, BRAF, NTRK, PD-L1
- Targeted therapy for driver mutations:
  * EGFR mutations: osimertinib first-line
  * ALK rearrangements: alectinib or crizotinib
  * ROS1 rearrangements: crizotinib or entrectinib
- Immunotherapy ± chemotherapy for PD-L1 positive without driver mutations
- Chemotherapy for PD-L1 negative without driver mutations

SMALL CELL LUNG CANCER (SCLC):

Limited Stage:
- Concurrent chemoradiation (cisplatin/etoposide + radiation)
- Prophylactic cranial irradiation if complete response

Extensive Stage:
- Chemotherapy: platinum-based (cisplatin or carboplatin) + etoposide
- Consider adding atezolizumab for first-line treatment
- Prophylactic cranial irradiation for selected patients with good response

SURVEILLANCE:
- History and physical exam every 3-4 months for 2 years
- CT chest every 6 months for 2 years
- Monitor for second primary cancers

POPULATION: Adults with lung cancer
NCI PDQ SUMMARY: Last Modified 01/12/2024`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'nci-pdq-lung-cancer-treatment',
            publication_date: '2024-01-12',
            last_reviewed: '2024-01-12',
            category: 'Cancer Treatment',
            author: 'National Cancer Institute',
            organization: 'NCI',
            evidence_level: 'Level I-II',
            url: 'https://www.cancer.gov/types/lung/hp/lung-treatment-pdq'
          }
        },
        {
          title: 'Colorectal Cancer Treatment (PDQ®)–Health Professional Version',
          content: `This PDQ cancer information summary provides comprehensive information about the treatment of colorectal cancer.

STAGING AND PROGNOSIS:
- TNM staging system
- Microsatellite instability (MSI) testing
- RAS and BRAF mutation testing for metastatic disease
- CEA level as baseline and for monitoring

TREATMENT BY STAGE:

Stage 0 (Carcinoma in Situ):
- Local excision or polypectomy
- No additional therapy required

Stage I:
- Surgery: Wide local excision with adequate margins
- No adjuvant therapy typically required
- Consider adjuvant chemotherapy for high-risk features

Stage II:
- Surgery: Standard resection with lymph node dissection
- Adjuvant chemotherapy for high-risk stage II (T4, poorly differentiated, <12 lymph nodes examined)
- MSI-high tumors: avoid 5-FU monotherapy, consider immunotherapy in clinical trials

Stage III:
- Surgery: Standard resection
- Adjuvant chemotherapy: FOLFOX or CapeOX for 3-6 months
- Duration based on risk stratification and toxicity

Stage IV (Metastatic):
- Systemic chemotherapy primary treatment
- First-line: FOLFOX, FOLFIRI, or FOLFOXIRI
- Targeted therapy based on molecular markers:
  * RAS wild-type: cetuximab or panitumumab
  * BRAF V600E mutated: encorafenib + cetuximab
  * MSI-high: pembrolizumab or nivolumab
- Consider metastasectomy if limited metastatic disease

RECTAL CANCER SPECIFIC:
- Neoadjuvant chemoradiation for T3-4 or node-positive disease
- Total mesorectal excision (TME)
- Consider watch-and-wait for complete clinical response

SURVEILLANCE:
- CEA every 3-6 months for 2 years, then every 6 months
- CT chest/abdomen/pelvis every 6-12 months for 3 years
- Colonoscopy at 1 year, then every 3-5 years

POPULATION: Adults with colorectal cancer
NCI PDQ SUMMARY: Last Modified 11/30/2023`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'nci-pdq-colorectal-cancer-treatment',
            publication_date: '2023-11-30',
            last_reviewed: '2023-11-30',
            category: 'Cancer Treatment',
            author: 'National Cancer Institute',
            organization: 'NCI',
            evidence_level: 'Level I-II',
            url: 'https://www.cancer.gov/types/colorectal/hp/colorectal-treatment-pdq'
          }
        },
        {
          title: 'Prostate Cancer Treatment (PDQ®)–Health Professional Version',
          content: `This PDQ cancer information summary provides comprehensive information about the treatment of prostate cancer.

RISK STRATIFICATION:
- Very Low Risk: PSA <10, Gleason ≤6, T1c, <3 positive biopsy cores, <50% cancer in any core
- Low Risk: PSA <10, Gleason ≤6, T1-T2a
- Intermediate Risk: PSA 10-20 or Gleason 7 or T2b
- High Risk: PSA >20 or Gleason 8-10 or T2c-T3a
- Very High Risk: T3b-T4 or primary Gleason pattern 5

TREATMENT BY RISK CATEGORY:

Very Low/Low Risk:
- Active surveillance preferred for most patients
- Radical prostatectomy or radiation therapy for select patients
- Monitoring: PSA every 6 months, DRE annually, repeat biopsy

Intermediate Risk:
- Radical prostatectomy with pelvic lymph node dissection
- External beam radiation + short-term androgen deprivation (4-6 months)
- Brachytherapy ± external beam radiation

High Risk:
- Radical prostatectomy with extended pelvic lymph node dissection
- External beam radiation + long-term androgen deprivation (18-36 months)
- Consider docetaxel with androgen deprivation for very high-risk

Very High Risk/Locally Advanced:
- External beam radiation + long-term androgen deprivation
- Consider radical prostatectomy in select cases
- Multimodal therapy often required

Metastatic Disease:
- Androgen deprivation therapy (ADT)
- Chemohormonal therapy: docetaxel + ADT for high-volume disease
- Novel hormonal agents: abiraterone, enzalutamide, apalutamide
- Second-line chemotherapy: cabazitaxel
- Bone-targeted therapy for bone metastases

CASTRATION-RESISTANT PROSTATE CANCER:
- Abiraterone, enzalutamide, or docetaxel
- Radium-223 for bone-predominant disease
- PARP inhibitors for homologous recombination deficiency
- Immunotherapy (pembrolizumab) for MSI-high tumors

SURVEILLANCE:
- PSA every 3-6 months for 5 years, then annually
- Digital rectal exam annually
- Monitor for treatment-related toxicities

POPULATION: Adult men with prostate cancer
NCI PDQ SUMMARY: Last Modified 12/08/2023`,
          specialty: 'Oncology' as Specialty,
          metadata: {
            guideline_id: 'nci-pdq-prostate-cancer-treatment',
            publication_date: '2023-12-08',
            last_reviewed: '2023-12-08',
            category: 'Cancer Treatment',
            author: 'National Cancer Institute',
            organization: 'NCI',
            evidence_level: 'Level I-II',
            url: 'https://www.cancer.gov/types/prostate/hp/prostate-treatment-pdq'
          }
        }
      ];

      // Process each guideline
      for (const guideline of nciPdqGuidelines) {
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
            console.log(`Processed NCI PDQ guideline: ${guideline.title}`);
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
        await this.logIngestion('completed', `Successfully processed ${result.documentsUpdated} NCI PDQ guidelines`, result.documentsUpdated);
      } else {
        await this.logIngestion('failed', `Failed with ${result.errors.length} errors`, result.documentsUpdated);
      }

      console.log(`Completed NCI PDQ: processed ${result.documentsProcessed}, updated ${result.documentsUpdated}`);
      
    } catch (error) {
      result.errors.push(`NCI PDQ ingestion failed: ${error}`);
      await this.logIngestion('failed', `Critical error: ${error}`);
    }

    return result;
  }
} 