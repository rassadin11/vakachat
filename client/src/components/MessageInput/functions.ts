import { StreamOptions } from "../../api/openrouter";
import { Attachment } from "../../types";
import { ModeId, MODES } from "../../utils/modes";
import { v4 as uuidv4 } from 'uuid';

const DOCUMENT_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

export function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function processFile(file: File, allowImages: boolean, allowDocuments: boolean): Promise<Attachment | null> {
    const isImage = file.type.startsWith('image/');
    const isDocument = DOCUMENT_TYPES.includes(file.type);

    if (isImage && !allowImages) return null;
    if (isDocument && !allowDocuments) return null;
    if (!isImage && !isDocument && !file.name.match(/\.(txt|md|js|ts|tsx|jsx|py|json|csv|xml|html|css|scss|yaml|yml|sh|sql|c|cpp|h|java|rs|go|rb|php|swift|pdf)$/)) {
        return null;
    }

    const data = await readFileAsBase64(file);

    return {
        id: uuidv4(),
        name: file.name,
        data,
        isImage,
        isDocument,
        mimeType: file.type,
        size: file.size,
    };
}

export function autoResizeTextarea(el: HTMLTextAreaElement, maxRows: number) {
    el.style.height = '0';

    if (!el.dataset.lineH) {
        const v = el.value;
        el.value = 'x';
        const h1 = el.scrollHeight;
        el.value = 'x\nx';
        const h2 = el.scrollHeight;
        el.value = v;
        el.dataset.lineH = String(h2 - h1);
        el.dataset.baseH = String(h1);
    }

    const lineH = Number(el.dataset.lineH);
    const baseH = Number(el.dataset.baseH);
    const maxH = baseH + lineH * (maxRows - 1);
    const scrollH = el.scrollHeight;

    if (scrollH > maxH) {
        el.style.height = `${maxH}px`;
        el.style.overflowY = 'auto';
    } else {
        el.style.height = `${scrollH}px`;
        el.style.overflowY = 'hidden';
    }
}

export function buildOptions(activeModes: Set<ModeId>): StreamOptions | undefined {
    const prompts: string[] = [];
    const plugins: string[] = [];
    for (const mode of MODES) {
        if (!activeModes.has(mode.id)) continue;
        if (mode.systemPrompt) prompts.push(mode.systemPrompt);
        if (mode.plugin) plugins.push(mode.plugin);
    }
    if (prompts.length === 0 && plugins.length === 0) return undefined;
    return {
        ...(prompts.length > 0 ? { systemPrompt: prompts.join(' ') } : {}),
        ...(plugins.length > 0 ? { plugins } : {}),
    };
}