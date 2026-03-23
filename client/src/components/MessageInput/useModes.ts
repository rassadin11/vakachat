import { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { Mode, ModeId } from '../../utils/modes';

export function useModes() {
  const [activeModes, setActiveModes] = useState<Set<ModeId>>(new Set());

  const setModel = useChatStore((s) => s.setModel);
  const resetModel = useChatStore((s) => s.resetModel);
  const { isResearch, setIsResearch } = useChatStore((s) => s);

  const toggleMode = (mode: Mode) => {
    if (mode.forceModel) {
      setModel(mode.forceModel);
      setIsResearch(true);
    }

    if (isResearch && mode.forceModel) {
      resetModel();
      setIsResearch(false);
    }

    setActiveModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode.id)) {
        next.delete(mode.id);
      } else {
        mode.excludes?.forEach((ex) => next.delete(ex));
        next.add(mode.id);
      }
      return next;
    });
  };

  return { activeModes, toggleMode };
}
