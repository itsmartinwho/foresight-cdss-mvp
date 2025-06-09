import { useState, useEffect, useCallback } from 'react';
import { GuidelineBookmark, GuidelineRecentView } from '@/types/guidelines';

interface UseBookmarksProps {
  userId?: string;
  autoLoad?: boolean;
}

interface UseBookmarksReturn {
  // State
  bookmarks: GuidelineBookmark[];
  recentViews: GuidelineRecentView[];
  isLoading: boolean;
  error: string | null;
  
  // Bookmark actions
  addBookmark: (guidelineId: number, metadata?: Record<string, any>) => Promise<void>;
  removeBookmark: (guidelineId: number) => Promise<void>;
  toggleBookmark: (guidelineId: number, metadata?: Record<string, any>) => Promise<void>;
  isBookmarked: (guidelineId: number) => boolean;
  
  // Recent views actions
  addRecentView: (guidelineId: number, duration?: number) => Promise<void>;
  getRecentViews: (limit?: number) => GuidelineRecentView[];
  clearRecentViews: () => Promise<void>;
  
  // Utility functions
  getBookmarkCount: () => number;
  getBookmarkedGuidelineIds: () => number[];
  getRecentlyViewedIds: (withinDays?: number) => number[];
  
  // Data refresh
  refreshBookmarks: () => Promise<void>;
  refreshRecentViews: () => Promise<void>;
}

export function useBookmarks({
  userId = 'current-user', // Default placeholder - would come from auth context
  autoLoad = true
}: UseBookmarksProps = {}): UseBookmarksReturn {
  
  // State
  const [bookmarks, setBookmarks] = useState<GuidelineBookmark[]>([]);
  const [recentViews, setRecentViews] = useState<GuidelineRecentView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bookmark management
  const addBookmark = useCallback(async (guidelineId: number, metadata?: Record<string, any>) => {
    try {
      const response = await fetch('/api/guidelines/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guidelineId,
          userId,
          metadata
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add bookmark');
      }

      const newBookmark: GuidelineBookmark = await response.json();
      setBookmarks(prev => [...prev, newBookmark]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add bookmark';
      setError(errorMessage);
      console.error('Error adding bookmark:', err);
    }
  }, [userId]);

  const removeBookmark = useCallback(async (guidelineId: number) => {
    try {
      const response = await fetch(`/api/guidelines/bookmarks?guidelineId=${guidelineId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove bookmark');
      }

      setBookmarks(prev => prev.filter(bookmark => bookmark.guidelineId !== guidelineId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove bookmark';
      setError(errorMessage);
      console.error('Error removing bookmark:', err);
    }
  }, [userId]);

  const toggleBookmark = useCallback(async (guidelineId: number, metadata?: Record<string, any>) => {
    const isCurrentlyBookmarked = bookmarks.some(bookmark => bookmark.guidelineId === guidelineId);
    
    if (isCurrentlyBookmarked) {
      await removeBookmark(guidelineId);
    } else {
      await addBookmark(guidelineId, metadata);
    }
  }, [bookmarks, addBookmark, removeBookmark]);

  const isBookmarked = useCallback((guidelineId: number): boolean => {
    return bookmarks.some(bookmark => bookmark.guidelineId === guidelineId);
  }, [bookmarks]);

  // Recent views management
  const addRecentView = useCallback(async (guidelineId: number, duration: number = 0) => {
    try {
      // For now, store in localStorage (would be API in production)
      const recentView: GuidelineRecentView = {
        guidelineId,
        viewedAt: new Date().toISOString(),
        duration
      };

      // Update local state
      setRecentViews(prev => {
        // Remove existing view of same guideline and add new one
        const filtered = prev.filter(view => view.guidelineId !== guidelineId);
        return [recentView, ...filtered].slice(0, 50); // Keep only last 50 views
      });

      // Store in localStorage for persistence
      const storageKey = `guideline_recent_views_${userId}`;
      const updatedViews = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filteredViews = updatedViews.filter((view: GuidelineRecentView) => view.guidelineId !== guidelineId);
      const newViews = [recentView, ...filteredViews].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(newViews));
    } catch (err) {
      console.error('Error adding recent view:', err);
    }
  }, [userId]);

  const getRecentViews = useCallback((limit: number = 10): GuidelineRecentView[] => {
    return recentViews.slice(0, limit);
  }, [recentViews]);

  const clearRecentViews = useCallback(async () => {
    try {
      setRecentViews([]);
      const storageKey = `guideline_recent_views_${userId}`;
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Error clearing recent views:', err);
    }
  }, [userId]);

  // Utility functions
  const getBookmarkCount = useCallback((): number => {
    return bookmarks.length;
  }, [bookmarks]);

  const getBookmarkedGuidelineIds = useCallback((): number[] => {
    return bookmarks.map(bookmark => bookmark.guidelineId);
  }, [bookmarks]);

  const getRecentlyViewedIds = useCallback((withinDays: number = 7): number[] => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - withinDays);
    
    return recentViews
      .filter(view => new Date(view.viewedAt) > cutoff)
      .map(view => view.guidelineId);
  }, [recentViews]);

  // Data refresh functions
  const refreshBookmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/guidelines/bookmarks?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const fetchedBookmarks: GuidelineBookmark[] = await response.json();
      setBookmarks(fetchedBookmarks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bookmarks';
      setError(errorMessage);
      console.error('Error fetching bookmarks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshRecentViews = useCallback(async () => {
    try {
      // Load from localStorage
      const storageKey = `guideline_recent_views_${userId}`;
      const storedViews = localStorage.getItem(storageKey);
      if (storedViews) {
        const parsedViews: GuidelineRecentView[] = JSON.parse(storedViews);
        setRecentViews(parsedViews);
      }
    } catch (err) {
      console.error('Error loading recent views:', err);
    }
  }, [userId]);

  // Load initial data
  useEffect(() => {
    if (autoLoad) {
      refreshBookmarks();
      refreshRecentViews();
    }
  }, [autoLoad, refreshBookmarks, refreshRecentViews]);

  return {
    // State
    bookmarks,
    recentViews,
    isLoading,
    error,
    
    // Bookmark actions
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    
    // Recent views actions
    addRecentView,
    getRecentViews,
    clearRecentViews,
    
    // Utility functions
    getBookmarkCount,
    getBookmarkedGuidelineIds,
    getRecentlyViewedIds,
    
    // Data refresh
    refreshBookmarks,
    refreshRecentViews
  };
} 