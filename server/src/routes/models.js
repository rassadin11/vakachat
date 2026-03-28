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

export async function getModels(req, res) {
    try {
        const cached = getCachedModels();
        if (cached !== null) return res.json(cached);          // ← отдаём из кеша

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

        const models = data
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
                    promptRUB: m.pricing.prompt * getRate(),
                    completionRUB: m.pricing.completion * getRate()
                },
                supported_parameters: m.supported_parameters,
                architecture: m.architecture,
                default_parameters: m.default_parameters,
            }));

        setCachedModels(models);

        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}