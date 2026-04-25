import { getCachedModels, setCachedModels } from "../cache/modelsCache.js";
import { getRate } from "../constants/constants.js";

const ALLOWED_PREFIXES = [
    'anthropic/',
    'google/',
    'openai/',
    'deepseek/',
    'z-ai/',       // GLM (ZhipuAI)
    'moonshotai/',  // Kimi
];

const BLOCKED_PREFIXES = [
    'free',
    'gemma',
    'gpt-3.5',
    'gpt-4-turbo',
    'gpt-4o'
];

const COMPANY_ORDER = ['anthropic', 'openai', 'google', 'deepseek', 'moonshotai', 'z-ai'];

const COMPANY_NAMES = {
    'anthropic':  'Anthropic',
    'openai':     'OpenAI',
    'google':     'Google',
    'deepseek':   'DeepSeek',
    'moonshotai': 'Moonshot AI',
    'z-ai':       'ZhipuAI',
};

function getCompanyKey(modelId) {
    return ALLOWED_PREFIXES
        .map(p => p.replace('/', ''))
        .find(key => modelId.startsWith(key + '/')) ?? 'other';
}

function isImageModel(m) {
    const modality = m.architecture?.modality ?? m.architecture?.output ?? '';
    return modality.endsWith('->image') || modality === 'image';
}

function groupByCompany(models) {
    const map = new Map();

    for (const model of models) {
        const key = getCompanyKey(model.id);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(model);
    }

    return COMPANY_ORDER
        .filter(key => map.has(key))
        .map(key => ({
            company: COMPANY_NAMES[key] ?? key,
            models: map.get(key),
        }));
}

export async function getModels(req, res) {
    try {
        const cached = getCachedModels();
        if (cached !== null) return res.json(cached);

        const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return res.status(502).json({ error: "Не удалось получить модели" });
        }

        const { data } = await response.json();

        const rate = getRate();

        const mapped = data
            .filter(m => ALLOWED_PREFIXES.some(prefix => m.id.startsWith(prefix)))
            .filter(m => !BLOCKED_PREFIXES.some(prefix => m.id.toLowerCase().includes(prefix)))
            .filter(m => !m.name.toLowerCase().includes('audio'))
            .map(m => ({
                id: m.id,
                name: m.name,
                context_length: m.context_length,
                pricing: {
                    prompt: m.pricing.prompt,
                    completion: m.pricing.completion,
                    promptRUB: m.pricing.prompt * rate,
                    completionRUB: m.pricing.completion * rate,
                },
                supported_parameters: m.supported_parameters,
                architecture: m.architecture,
                default_parameters: m.default_parameters,
            }));

        const languageModels = mapped.filter(m => !isImageModel(m));
        const imageModels    = mapped.filter(m =>  isImageModel(m));

        const result = {
            language: groupByCompany(languageModels),
            image:    groupByCompany(imageModels),
        };

        setCachedModels(result);

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}