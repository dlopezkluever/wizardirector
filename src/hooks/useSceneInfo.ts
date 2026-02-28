import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SceneInfo {
  sceneNumber: number;
  slug: string;
  isLoading: boolean;
}

export function useSceneInfo(sceneId: string | undefined): SceneInfo {
  const [sceneNumber, setSceneNumber] = useState<number>(0);
  const [slug, setSlug] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sceneId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSceneInfo() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scenes')
        .select('scene_number, slug')
        .eq('id', sceneId)
        .single();

      if (!cancelled && data && !error) {
        setSceneNumber(data.scene_number);
        setSlug(data.slug ?? '');
      }
      if (!cancelled) setIsLoading(false);
    }

    fetchSceneInfo();
    return () => { cancelled = true; };
  }, [sceneId]);

  return { sceneNumber, slug, isLoading };
}
