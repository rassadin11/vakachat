import { useRef, useEffect } from 'react';

export function useTooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  function showTooltip(e: React.MouseEvent<HTMLButtonElement>, text: string) {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

    tooltip.textContent = text;
    tooltip.style.opacity = '1';

    const btnRect = e.currentTarget.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 8;

    let left = btnRect.left + btnRect.width / 2 - tooltipRect.width / 2;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${btnRect.top - tooltipRect.height - 10}px`;

    if (window.matchMedia('(max-width: 768px)').matches) {
      tooltipTimerRef.current = setTimeout(() => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      }, 3000);
    }
  }

  function hideTooltip() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
  }

  return { tooltipRef, showTooltip, hideTooltip };
}
