import { useEffect, useState } from 'react';
import type { MindmapNodeLocation } from '../../../lib/mindmaps';

export function useFeedback() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [mindmapNodeUndo, setMindmapNodeUndo] = useState<{ mindmapId: string; location: MindmapNodeLocation } | null>(null);

  function showToast(text: string) {
    setMindmapNodeUndo(null);
    setToast(text);
  }

  useEffect(() => {
    if (!toast) {
      setMindmapNodeUndo(null);
      return;
    }
    const timeout = setTimeout(() => setToast(''), mindmapNodeUndo ? 6000 : 3000);
    return () => clearTimeout(timeout);
  }, [toast, mindmapNodeUndo]);

  return {
    error,
    setError,
    message,
    setMessage,
    toast,
    setToast,
    mindmapNodeUndo,
    setMindmapNodeUndo,
    showToast,
  };
}

export type FeedbackState = ReturnType<typeof useFeedback>;
