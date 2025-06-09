import { getSupabaseClient } from '@/lib/supabaseClient';
import { GuidelineSearchService } from './search-service';
import {
  GuidelineCard,
  GuidelineModalData,
  GuidelineSection,
  GuidelineFilter,
  GuidelineBookmark,
  GuidelineReference,
  SpecialtyCategory,
  SourceTheme,
  GuidelineSearchResultItem,
  GuidelineDoc,
  GuidelineSource,
  Specialty,
  GuidelineRecentView,
  GuidelineUsageAnalytics
} from '@/types/guidelines';

export class GuidelineUIService {
  private supabase;
  private searchService: GuidelineSearchService;

  constructor() {
    try {
      this.supabase = getSupabaseClient();
      this.searchService = new GuidelineSearchService();
    } catch (error) {
      console.error('Failed to initialize Supabase client in GuidelineUIService:', error);
      // Set to null to handle gracefully in methods
      this.supabase = null as any;
      this.searchService = null as any;
    }
  }

  /**
   * Convert raw guideline data to UI card format
   */
  async convertToGuidelineCards(
    guidelines: GuidelineDoc[],
    bookmarks: GuidelineBookmark[] = [],
    recentViews: GuidelineRecentView[] = []
  ): Promise<GuidelineCard[]> {
    const bookmarkedIds = new Set(bookmarks.map(b => b.guidelineId));
    const recentViewsMap = new Map(recentViews.map(r => [r.guidelineId, r]));
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

    return guidelines.map(guideline => ({
      id: guideline.id,
      title: guideline.title,
      source: guideline.source,
      specialty: guideline.specialty,
      preview: this.generatePreview(guideline.content),
      metadata: guideline.metadata,
      lastUpdated: guideline.last_updated,
      isBookmarked: bookmarkedIds.has(guideline.id),
      isRecentlyViewed: recentViewsMap.has(guideline.id),
      isRecentlyUpdated: new Date(guideline.last_updated) > recentThreshold
    }));
  }

  /**
   * Generate preview text from content
   */
  private generatePreview(content: string, maxLength: number = 150): string {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength) + '...';
  }

  /**
   * Parse guideline content into structured sections
   */
  parseGuidelineSections(content: string): GuidelineSection[] {
    const sections: GuidelineSection[] = [];
    
    // Split content by headers or key patterns
    const patterns = [
      { pattern: /(?:^|\n)##?\s*(Key Recommendations?|Summary|Recommendations?)[\s\S]*?(?=\n##|$)/gi, type: 'key_recommendations' as const },
      { pattern: /(?:^|\n)##?\s*(Implementation|How to|Guidance|Clinical Application)[\s\S]*?(?=\n##|$)/gi, type: 'implementation' as const },
      { pattern: /(?:^|\n)##?\s*(Rationale|Evidence|Background|Justification)[\s\S]*?(?=\n##|$)/gi, type: 'rationale' as const },
      { pattern: /(?:^|\n)##?\s*(Population|Patients?|Target|Scope)[\s\S]*?(?=\n##|$)/gi, type: 'population_criteria' as const },
    ];

    let sectionId = 1;
    
    patterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const lines = match.trim().split('\n');
          const title = lines[0].replace(/^#+\s*/, '').trim();
          const sectionContent = lines.slice(1).join('\n').trim();
          
          if (sectionContent.length > 0) {
            sections.push({
              id: `section-${sectionId++}`,
              title,
              content: sectionContent,
              type,
              isExpanded: false
            });
          }
        });
      }
    });

    // If no structured sections found, create a general section
    if (sections.length === 0) {
      sections.push({
        id: 'section-1',
        title: 'Content',
        content: content,
        type: 'other',
        isExpanded: true
      });
    }

    return sections;
  }

  /**
   * Get guideline data formatted for modal display
   */
  async getGuidelineModalData(id: number): Promise<GuidelineModalData | null> {
    try {
      const guideline = await this.searchService.getGuidelineById(id);
      if (!guideline) return null;

      const sections = this.parseGuidelineSections(guideline.content);
      const breadcrumbs = [
        'Guidelines',
        this.getSpecialtyDisplayName(guideline.specialty),
        this.getSourceDisplayName(guideline.source),
        guideline.title
      ];

      return {
        id: guideline.id,
        title: guideline.title,
        source: guideline.source,
        specialty: guideline.specialty,
        metadata: guideline.metadata,
        sections,
        breadcrumbs,
        fullContent: guideline.content
      };
    } catch (error) {
      console.error('Error getting guideline modal data:', error);
      return null;
    }
  }

  /**
   * Filter guidelines based on UI filters
   */
  async getFilteredGuidelines(filter: GuidelineFilter, limit: number = 20): Promise<GuidelineCard[]> {
    if (!this.searchService) {
      console.warn('Search service not available, returning empty guidelines');
      return [];
    }

    try {
      let guidelines: GuidelineDoc[] = [];

      if (filter.searchQuery.trim()) {
        // Use search functionality
        const searchResults = await this.searchService.textSearch(
          filter.searchQuery,
          filter.specialties.length === 1 ? filter.specialties[0] : undefined,
          limit
        );
        
        // Convert search results to full guideline docs
        const guidelinePromises = searchResults.map(result => 
          this.searchService.getGuidelineById(result.id)
        );
        const guidelineResults = await Promise.all(guidelinePromises);
        guidelines = guidelineResults.filter(g => g !== null) as GuidelineDoc[];
      } else {
        // Get all guidelines with filtering
        const specialty = filter.specialties.length === 1 ? filter.specialties[0] : 'All';
        const result = await this.searchService.getGuidelinesBySpecialty(specialty, limit);
        guidelines = result.guidelines;
      }

      // Apply source filtering
      if (filter.sources.length > 0 && !filter.sources.includes('NICE' as any)) {
        guidelines = guidelines.filter(g => filter.sources.includes(g.source));
      }

      // Get bookmarks for current user (placeholder - would need user context)
      const bookmarks: GuidelineBookmark[] = []; // TODO: Implement user-specific bookmarks

      // Apply bookmark filtering
      if (filter.showBookmarksOnly) {
        const bookmarkedIds = new Set(bookmarks.map(b => b.guidelineId));
        guidelines = guidelines.filter(g => bookmarkedIds.has(g.id));
      }

      // Sort results
      guidelines = this.sortGuidelines(guidelines, filter.sortBy);

      return this.convertToGuidelineCards(guidelines, bookmarks);
    } catch (error) {
      console.error('Error filtering guidelines:', error);
      return [];
    }
  }

  /**
   * Sort guidelines based on selected criteria
   */
  private sortGuidelines(guidelines: GuidelineDoc[], sortBy: GuidelineFilter['sortBy']): GuidelineDoc[] {
    switch (sortBy) {
      case 'recency':
        return guidelines.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
      case 'alphabetical':
        return guidelines.sort((a, b) => a.title.localeCompare(b.title));
      case 'authority':
        const sourceOrder: Record<GuidelineSource, number> = {
          'USPSTF': 1,
          'NICE': 2,
          'NCI_PDQ': 3,
          'RxNorm': 4,
          'MANUAL': 5
        };
        return guidelines.sort((a, b) => sourceOrder[a.source] - sourceOrder[b.source]);
      case 'relevance':
      default:
        return guidelines; // Keep original order for relevance
    }
  }

  /**
   * Get specialty categories with metadata
   */
  async getSpecialtyCategories(): Promise<SpecialtyCategory[]> {
    let stats;
    if (!this.searchService) {
      console.warn('Search service not available, using default stats');
      stats = {
        totalGuidelines: 15,
        bySpecialty: {
          'Primary Care': 5,
          'Cardiology': 3,
          'Oncology': 4,
          'Endocrinology': 2,
          'Mental Health Conditions and Substance Abuse': 1
        },
        bySource: {},
        lastUpdated: null
      };
    } else {
      try {
        stats = await this.searchService.getStatistics();
      } catch (error) {
        console.error('Error getting statistics, using defaults:', error);
        stats = {
          totalGuidelines: 15,
          bySpecialty: {
            'Primary Care': 5,
            'Cardiology': 3,
            'Oncology': 4,
            'Endocrinology': 2,
            'Mental Health Conditions and Substance Abuse': 1
          },
          bySource: {},
          lastUpdated: null
        };
      }
    }
    
    const specialtyConfigs: Record<Specialty, { displayName: string; icon: string; description: string; color: string }> = {
      'All': { displayName: 'All Specialties', icon: '🏥', description: 'All clinical guidelines', color: '#6B7280' },
      'Primary Care': { displayName: 'Primary Care', icon: '👩‍⚕️', description: 'General practice and family medicine', color: '#059669' },
      'Cardiology': { displayName: 'Cardiology', icon: '❤️', description: 'Heart and cardiovascular system', color: '#DC2626' },
      'Oncology': { displayName: 'Oncology', icon: '🎗️', description: 'Cancer diagnosis and treatment', color: '#7C3AED' },
      'Endocrinology': { displayName: 'Endocrinology', icon: '🔬', description: 'Hormones and metabolism', color: '#DB2777' },
      'Mental Health Conditions and Substance Abuse': { displayName: 'Mental Health', icon: '🧠', description: 'Mental health and substance abuse', color: '#2563EB' },
      'Obstetric and Gynecologic Conditions': { displayName: 'OB/GYN', icon: '👶', description: 'Women\'s health and pregnancy', color: '#EC4899' },
      'Rheumatology': { displayName: 'Rheumatology', icon: '🦴', description: 'Joints and autoimmune conditions', color: '#059669' },
      'Pharmacology': { displayName: 'Pharmacology', icon: '💊', description: 'Drug interactions and therapy', color: '#EA580C' },
      'Neurology': { displayName: 'Neurology', icon: '🧠', description: 'Nervous system disorders', color: '#7C2D12' },
      'Pulmonology': { displayName: 'Pulmonology', icon: '🫁', description: 'Respiratory system', color: '#0284C7' },
      'Gastroenterology': { displayName: 'Gastroenterology', icon: '🫃', description: 'Digestive system', color: '#65A30D' },
      'Infectious Disease': { displayName: 'Infectious Disease', icon: '🦠', description: 'Infections and immunology', color: '#DC2626' },
      'General Medicine': { displayName: 'General Medicine', icon: '🏥', description: 'General medical practice', color: '#6B7280' }
    };

    return Object.entries(specialtyConfigs).map(([specialty, config]) => ({
      id: specialty as Specialty,
      displayName: config.displayName,
      icon: config.icon,
      description: config.description,
      guidelineCount: stats.bySpecialty[specialty] || 0,
      color: config.color
    }));
  }

  /**
   * Get source themes for visual styling
   */
  getSourceThemes(): SourceTheme[] {
    return [
      {
        source: 'USPSTF',
        primaryColor: '#1E40AF',
        secondaryColor: '#DBEAFE',
        badgeColor: '#3B82F6',
        displayName: 'US Preventive Services Task Force',
        iconUrl: '/images/sources/uspstf.png'
      },
      {
        source: 'NICE',
        primaryColor: '#7C3AED',
        secondaryColor: '#EDE9FE',
        badgeColor: '#8B5CF6',
        displayName: 'National Institute for Health and Care Excellence',
        iconUrl: '/images/sources/nice.png'
      },
      {
        source: 'NCI_PDQ',
        primaryColor: '#059669',
        secondaryColor: '#D1FAE5',
        badgeColor: '#10B981',
        displayName: 'National Cancer Institute PDQ',
        iconUrl: '/images/sources/nci.png'
      },
      {
        source: 'RxNorm',
        primaryColor: '#EA580C',
        secondaryColor: '#FED7AA',
        badgeColor: '#F97316',
        displayName: 'RxNorm Drug Database',
        iconUrl: '/images/sources/rxnorm.png'
      },
      {
        source: 'MANUAL',
        primaryColor: '#6B7280',
        secondaryColor: '#F3F4F6',
        badgeColor: '#9CA3AF',
        displayName: 'Manual Guidelines',
        iconUrl: '/images/sources/manual.png'
      }
    ];
  }

  /**
   * Get display name for specialty
   */
  private getSpecialtyDisplayName(specialty: Specialty): string {
    const specialtyMap: Record<Specialty, string> = {
      'All': 'All Specialties',
      'Primary Care': 'Primary Care',
      'Cardiology': 'Cardiology',
      'Oncology': 'Oncology',
      'Endocrinology': 'Endocrinology',
      'Mental Health Conditions and Substance Abuse': 'Mental Health',
      'Obstetric and Gynecologic Conditions': 'OB/GYN',
      'Rheumatology': 'Rheumatology',
      'Pharmacology': 'Pharmacology',
      'Neurology': 'Neurology',
      'Pulmonology': 'Pulmonology',
      'Gastroenterology': 'Gastroenterology',
      'Infectious Disease': 'Infectious Disease',
      'General Medicine': 'General Medicine'
    };
    return specialtyMap[specialty] || specialty;
  }

  /**
   * Get display name for source
   */
  private getSourceDisplayName(source: GuidelineSource): string {
    const sourceMap: Record<GuidelineSource, string> = {
      'USPSTF': 'USPSTF',
      'NICE': 'NICE',
      'NCI_PDQ': 'NCI PDQ',
      'RxNorm': 'RxNorm',
      'MANUAL': 'Manual'
    };
    return sourceMap[source] || source;
  }

  /**
   * Extract guideline references from advisor text
   */
  extractGuidelineReferences(advisorText: string, searchResults: any[] = []): GuidelineReference[] {
    // This would parse advisor response text to identify guideline references
    // For now, return mock data based on search results
    return searchResults.slice(0, 3).map((result, index) => ({
      id: result.id || index,
      title: result.title || `Guideline ${index + 1}`,
      source: result.source || 'USPSTF',
      relevanceScore: result.similarity || 0.8,
      excerpt: result.content?.substring(0, 100) || ''
    }));
  }

  /**
   * Track guideline view for analytics
   */
  async trackGuidelineView(guidelineId: number, userId: string, duration: number = 0): Promise<void> {
    try {
      // This would typically store in a user_guideline_views table
      console.log(`Tracking view: User ${userId} viewed guideline ${guidelineId} for ${duration}s`);
    } catch (error) {
      console.error('Error tracking guideline view:', error);
    }
  }

  /**
   * Get usage analytics for guidelines
   */
  async getUsageAnalytics(guidelineId: number): Promise<GuidelineUsageAnalytics | null> {
    try {
      // This would query analytics tables
      // For now, return mock data
      return {
        guidelineId,
        viewCount: Math.floor(Math.random() * 100),
        bookmarkCount: Math.floor(Math.random() * 50),
        lastViewed: new Date().toISOString(),
        averageViewDuration: Math.floor(Math.random() * 300),
        popularSections: ['Key Recommendations', 'Implementation']
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      return null;
    }
  }

  /**
   * Get available sources from the database
   */
  async getAvailableSources(): Promise<GuidelineSource[]> {
    if (!this.supabase) {
      console.warn('Supabase client not available, returning default sources');
      return ['USPSTF', 'NICE', 'NCI_PDQ', 'RxNorm', 'MANUAL'];
    }

    try {
      const { data, error } = await this.supabase
        .from('guidelines_docs')
        .select('source')
        .not('source', 'is', null);

      if (error) throw error;

      // Get unique sources
      const uniqueSources = [...new Set(data.map(item => item.source))];
      return uniqueSources.filter(source => source) as GuidelineSource[];
    } catch (error) {
      console.error('Error getting available sources:', error);
      // Return default sources as fallback
      return ['USPSTF', 'NICE', 'NCI_PDQ', 'RxNorm', 'MANUAL'];
    }
  }

  /**
   * Get guideline counts by source
   */
  async getGuidelineCountsBySource(): Promise<Record<GuidelineSource, number>> {
    if (!this.supabase) {
      console.warn('Supabase client not available, returning default counts');
      return {
        'USPSTF': 5,
        'NICE': 4,
        'NCI_PDQ': 3,
        'RxNorm': 2,
        'MANUAL': 1
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('guidelines_docs')
        .select('source')
        .not('source', 'is', null);

      if (error) throw error;

      // Count guidelines by source
      const counts: Record<string, number> = {};
      data.forEach(item => {
        if (item.source) {
          counts[item.source] = (counts[item.source] || 0) + 1;
        }
      });

      return counts as Record<GuidelineSource, number>;
    } catch (error) {
      console.error('Error getting guideline counts by source:', error);
      // Return default counts as fallback
      return {
        'USPSTF': 5,
        'NICE': 4,
        'NCI_PDQ': 3,
        'RxNorm': 2,
        'MANUAL': 1
      };
    }
  }
} 