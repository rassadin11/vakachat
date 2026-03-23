import { Model } from "../../types";
import { SortDir, SortKey } from "./types";

function getPrice(pricing: { prompt: string; completion: string } | undefined, field: 'prompt' | 'completion'): number {
    return parseFloat(pricing?.[field] ?? '0');
}

function isTextModel(model: Model): boolean {
    return !model.architecture?.output_modalities?.includes('image');
}

function isImageOutputModel(model: Model): boolean {
    return !!model.architecture?.output_modalities?.includes('image');
}

export function filterAndSortModels(
    models: Model[],
    lockedModels: Model[],
    search: string,
    sortKey: SortKey,
    sortDir: SortDir,
) {
    const query = search.toLowerCase();
    const matchesSearch = (m: Model) =>
        m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);

    const filtered = models.filter(matchesSearch);
    const filteredLocked = lockedModels.filter(matchesSearch);

    const sorted = [...filtered].sort((a, b) => {
        if (sortKey === 'default') return 0;
        const field = sortKey === 'input' ? 'prompt' : 'completion';
        const diff = getPrice(a.pricing, field) - getPrice(b.pricing, field);
        return sortDir === 'asc' ? diff : -diff;
    });

    return {
        filteredLocked,
        sorted,
        textModels: sorted.filter(isTextModel),
        imageModels: sorted.filter(isImageOutputModel),
    };
}