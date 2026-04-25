import { Model } from "../../types";
import { SortDir, SortKey } from "./types";

export type CompanyGroup = { company: string; models: Model[] };

function getPrice(pricing: { prompt: string; completion: string } | undefined, field: 'prompt' | 'completion'): number {
    return parseFloat(pricing?.[field] ?? '0');
}

function isTextModel(model: Model): boolean {
    return !model.architecture?.output_modalities?.includes('image');
}

function isImageOutputModel(model: Model): boolean {
    return !!model.architecture?.output_modalities?.includes('image');
}

function groupByCompany(models: Model[]): CompanyGroup[] {
    const map = new Map<string, Model[]>();
    for (const m of models) {
        const key = m.company ?? 'Другие';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([company, models]) => ({ company, models }));
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
        textModelGroups: groupByCompany(sorted.filter(isTextModel)),
        imageModelGroups: groupByCompany(sorted.filter(isImageOutputModel)),
    };
}