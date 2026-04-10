import { Model } from '../types';

export function isReasoningModel(model: Model): boolean {
  if (model.supported_parameters?.includes('reasoning')) return true;
  const id = model.id.toLowerCase();
  return (
    /\/o\d/.test(id) ||
    id.includes('-r1') ||
    id.includes(':thinking') ||
    id.includes('qwq') ||
    id.includes('deepseek-r')
  );
}

export function isVisionModel(model: Model): boolean {
  return !!model.architecture?.input_modalities?.includes('image');
}

export function isFilesModel(model: Model): boolean {
  return !!model.architecture?.input_modalities?.includes('file');
}

export function formatModelPrice(pricing?: Model['pricing']): { free: boolean; input: string; output: string } | null {
  if (!pricing) return null;

  const inp = parseFloat(pricing.promptRUB) * 10_000;
  const out = parseFloat(pricing.completionRUB) * 10_000;

  const fmt = (n: number) =>
    n === 0 ? '$0' : n < 8 ? `${n.toFixed(3)} ₽` : `${n.toFixed(2)} ₽`;
  return { free: false, input: fmt(inp), output: fmt(out) };
}
