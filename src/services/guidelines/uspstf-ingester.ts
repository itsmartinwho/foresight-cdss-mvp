import { BaseGuidelineIngester, IngestionResult } from './base-ingester';

interface USPSTFRecommendation {
  uid: string;
  title: string;
  text: string;
  grade: string;
  year: number;
  topic: string;
  population: string;
  recommendation: string;
  rationale?: string;
  lastModified?: string;
}

export class USPSTFIngester extends BaseGuidelineIngester {
  private apiKey?: string;
  private baseUrl = 'https://www.uspreventiveservicestaskforce.org/api';

  constructor() {
    super('USPSTF');
    this.apiKey = process.env.USPSTF_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async ingest(): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      documentsProcessed: 0,
      documentsUpdated: 0,
      errors: []
    };

    if (!this.isConfigured()) {
      const error = 'USPSTF API key not configured';
      result.errors.push(error);
      await this.logIngestion('failed', error);
      return result;
    }

    await this.logIngestion('started', 'Starting USPSTF ingestion');

    try {
      const recommendations = await this.fetchRecommendations();
      
      for (const recommendation of recommendations) {
        try {
          const docId = await this.processRecommendation(recommendation);
          result.documentsProcessed++;
          
          if (docId) {
            result.documentsUpdated++;
          }
        } catch (error) {
          const errorMsg = `Error processing recommendation ${recommendation.uid}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      
      const message = `Processed ${result.documentsProcessed} recommendations, updated ${result.documentsUpdated}`;
      await this.logIngestion(
        result.success ? 'completed' : 'failed',
        message,
        result.documentsUpdated
      );

    } catch (error) {
      const errorMsg = `Failed to fetch USPSTF recommendations: ${error}`;
      result.errors.push(errorMsg);
      await this.logIngestion('failed', errorMsg);
    }

    return result;
  }

  private async fetchRecommendations(): Promise<USPSTFRecommendation[]> {
    // Note: This is a placeholder implementation as the actual USPSTF API details
    // would need to be confirmed. The USPSTF website doesn't appear to have
    // a public API, so this would likely need to be implemented as web scraping
    // or using their RSS feed for updates.
    
    try {
      // For now, we'll implement a mock response that would be replaced
      // with actual API calls or web scraping logic
      return await this.mockUSPSTFData();
    } catch (error) {
      throw new Error(`Failed to fetch from USPSTF: ${error}`);
    }
  }

  private async processRecommendation(recommendation: USPSTFRecommendation): Promise<number | null> {
    const title = `${recommendation.title} - USPSTF ${recommendation.grade} Recommendation`;
    
    const content = this.formatRecommendationContent(recommendation);
    const specialty = this.mapToSpecialty(recommendation.topic);
    
    const metadata = {
      guideline_id: recommendation.uid,
      grade: recommendation.grade,
      publication_date: recommendation.year.toString(),
      organization: 'USPSTF',
      category: recommendation.topic,
      author: 'US Preventive Services Task Force'
    };

    return await this.saveGuideline(title, content, specialty, metadata);
  }

  private formatRecommendationContent(rec: USPSTFRecommendation): string {
    return `# ${rec.title}

## Grade: ${rec.grade}
**Year:** ${rec.year}
**Population:** ${rec.population}

## Recommendation
${rec.recommendation}

${rec.text}

${rec.rationale ? `## Rationale\n${rec.rationale}` : ''}

---
*Source: US Preventive Services Task Force*
*Recommendation Grade: ${rec.grade}*`;
  }

  // Mock data for initial implementation - to be replaced with actual API/scraping
  private async mockUSPSTFData(): Promise<USPSTFRecommendation[]> {
    return [
      {
        uid: 'diabetes-screening-2021',
        title: 'Screening for Type 2 Diabetes',
        text: 'The USPSTF recommends screening for abnormal blood glucose as part of cardiovascular risk assessment in adults aged 40 to 70 years who are overweight or obese.',
        grade: 'B',
        year: 2021,
        topic: 'Diabetes Screening',
        population: 'Adults aged 40-70 years who are overweight or obese',
        recommendation: 'Screen for abnormal blood glucose as part of cardiovascular risk assessment in adults aged 40 to 70 years who are overweight or obese. Clinicians should offer or refer patients with abnormal blood glucose to intensive behavioral counseling interventions to promote a healthy diet and physical activity.',
        rationale: 'Adequate evidence that screening for abnormal blood glucose and subsequent treatment reduce cardiovascular events.'
      },
      {
        uid: 'colorectal-screening-2021',
        title: 'Screening for Colorectal Cancer',
        text: 'The USPSTF recommends screening for colorectal cancer in all adults aged 50 to 75 years.',
        grade: 'A',
        year: 2021,
        topic: 'Colorectal Cancer Screening',
        population: 'Adults aged 50-75 years',
        recommendation: 'Screen for colorectal cancer in all adults aged 50 to 75 years.',
        rationale: 'High certainty that the net benefit of screening is substantial.'
      },
      {
        uid: 'breast-cancer-screening-2019',
        title: 'Screening for Breast Cancer',
        text: 'The USPSTF recommends mammography screening every 2 years for women aged 50 to 74 years.',
        grade: 'B',
        year: 2019,
        topic: 'Breast Cancer Screening',
        population: 'Women aged 50-74 years',
        recommendation: 'Screen with mammography every 2 years for women aged 50 to 74 years.',
        rationale: 'Moderate certainty that the net benefit of mammography screening is moderate.'
      }
    ];
  }
} 