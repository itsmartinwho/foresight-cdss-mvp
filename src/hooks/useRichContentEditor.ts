import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { RichContent } from '@/lib/types';

interface UseRichContentEditorProps {
  encounterId: string;
  contentType: 'diagnosis' | 'treatments';
  initialContent?: RichContent;
  onError?: (error: Error) => void;
}

interface UseRichContentEditorReturn {
  content: RichContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  updateContent: (newContent: RichContent) => Promise<void>;
  saveContent: (content: RichContent) => Promise<void>;
  deleteRichElement: (elementId: string) => Promise<void>;
}

export const useRichContentEditor = ({
  encounterId,
  contentType,
  initialContent,
  onError
}: UseRichContentEditorProps): UseRichContentEditorReturn => {
  const [content, setContent] = useState<RichContent | null>(initialContent || null);
  const [isLoading, setIsLoading] = useState(Boolean(encounterId) && !initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = getSupabaseClient();

  // Load initial content if needed. If no encounterId (demo mode), ensure we are not stuck in loading state.
  useEffect(() => {
    if (!encounterId) {
      // No database source → immediately mark as not loading
      setIsLoading(false);
      return;
    }

    if (!initialContent) {
      loadContent();
    }
  }, [encounterId, initialContent]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('encounters')
        .select(`${contentType}_rich_content`)
        .eq('id', encounterId)
        .single();

      if (dbError) throw dbError;

      const richContent = data?.[`${contentType}_rich_content`];
      setContent(richContent || null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  }, [encounterId, contentType, supabase, onError]);

  const saveContent = useCallback(async (newContent: RichContent) => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedContent = {
        ...newContent,
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('encounters')
        .update({
          [`${contentType}_rich_content`]: updatedContent
        })
        .eq('id', encounterId);

      if (dbError) throw dbError;

      // Update local state immediately for optimistic UI
      setContent(updatedContent);
      
      return Promise.resolve();
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [encounterId, contentType, supabase, onError]);

  const updateContent = useCallback(async (newContent: RichContent) => {
    // Optimistic update
    setContent(newContent);
    
    // Debounced save (save after 500ms of no changes)
    await new Promise(resolve => setTimeout(resolve, 500));
    await saveContent(newContent);
  }, [saveContent]);

  const deleteRichElement = useCallback(async (elementId: string) => {
    if (!content) return;

    const updatedContent: RichContent = {
      ...content,
      rich_elements: content.rich_elements.filter(el => el.id !== elementId),
      updated_at: new Date().toISOString()
    };

    await saveContent(updatedContent);
  }, [content, saveContent]);

  return {
    content,
    isLoading,
    isSaving,
    error,
    updateContent,
    saveContent,
    deleteRichElement
  };
};

// Hook for batch operations on multiple rich content fields
export const useMultipleRichContentEditor = (encounterId: string) => {
  const diagnosis = useRichContentEditor({
    encounterId,
    contentType: 'diagnosis'
  });

  const treatments = useRichContentEditor({
    encounterId,
    contentType: 'treatments'
  });

  const saveAll = useCallback(async () => {
    const promises = [];
    
    if (diagnosis.content) {
      promises.push(diagnosis.saveContent(diagnosis.content));
    }
    
    if (treatments.content) {
      promises.push(treatments.saveContent(treatments.content));
    }

    await Promise.all(promises);
  }, [diagnosis, treatments]);

  return {
    diagnosis,
    treatments,
    saveAll,
    isLoading: diagnosis.isLoading || treatments.isLoading,
    isSaving: diagnosis.isSaving || treatments.isSaving,
    hasErrors: !!(diagnosis.error || treatments.error)
  };
};

export default useRichContentEditor; 