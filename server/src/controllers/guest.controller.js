// controllers/guest.controller.js

const GUEST_ALLOWED_PREFIXES = ['deepseek/', 'thudm/', 'z-ai/', 'google/gemini-3.1-flash-lite-preview'];

function isModelAllowed(modelId) {
    return GUEST_ALLOWED_PREFIXES.some(prefix => modelId.startsWith(prefix));
}

export async function guestMessage(req, res) {
    const { messages, model } = req.body;

    if (!model || !isModelAllowed(model)) {
        return res.status(400).json({ error: 'Эта модель недоступна для пробного режима. Выберите DeepSeek или zAI GLM.' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages обязательны' });
    }

    if (messages.length > 50) {
        return res.status(400).json({ error: 'Слишком длинная история сообщений' });
    }

    const controller = new AbortController();
    const abort = () => { if (!controller.signal.aborted) controller.abort(); };

    req.on('close', abort);
    res.on('close', abort);

    let upstreamResponse;
    try {
        upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model, messages, stream: true }),
            signal: controller.signal,
        });
    } catch (err) {
        if (err.name === 'AbortError') return res.end();
        return res.status(502).json({ error: 'Failed to reach upstream API' });
    }

    if (!upstreamResponse.ok) {
        const text = await upstreamResponse.text().catch(() => '');
        console.error('[Guest OpenRouter error]', upstreamResponse.status, text);
        return res.status(upstreamResponse.status).json({
            error: `Upstream API error: ${upstreamResponse.status}`,
            detail: text,
        });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstreamResponse.body.getReader();
    controller.signal.addEventListener('abort', () => reader.cancel().catch(() => { }));

    try {
        while (true) {
            if (controller.signal.aborted) break;

            let result;
            try { result = await reader.read(); } catch { break; }
            if (result.done) break;

            res.write(Buffer.from(result.value));
        }
    } catch {
        // stream interrupted
    } finally {
        reader.cancel().catch(() => { });
    }

    if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
    }
}
