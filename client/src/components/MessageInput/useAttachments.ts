import { useState, useCallback, useEffect } from 'react';
import type { Attachment, Model } from '../../types';
import { processFile } from './functions';

export function useAttachments(activeModel: Model | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [canAttachImages, setCanAttachImages] = useState(false);
  const [canAttachFiles, setCanAttachFiles] = useState(false);

  useEffect(() => {
    const modalities = activeModel?.architecture.input_modalities;
    if (!modalities) return;
    setCanAttachImages(modalities?.includes('image'));
    setCanAttachFiles(modalities?.includes('file'));
  }, [activeModel]);

  useEffect(() => {
    if (!canAttachFiles) {
      setAttachments((prev) => prev.filter((a) => a.isImage || !a.isDocument));
    }
  }, [canAttachFiles]);

  const handleFiles = useCallback(async (files: File[], allowImages: boolean, allowDocuments: boolean) => {
    const results = await Promise.all(files.map((f) => processFile(f, allowImages, allowDocuments)));
    const valid = results.filter(Boolean) as Attachment[];
    if (valid.length > 0) setAttachments((prev) => [...prev, ...valid]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { attachments, setAttachments, canAttachImages, canAttachFiles, handleFiles, removeAttachment };
}
