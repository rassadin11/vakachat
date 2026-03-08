// controllers/chat.controller.js
import * as chatService from '../services/chat.service.js';

// ─── ЧАТЫ ────────────────────────────────────────────────────────────────────

export async function createChat(req, res) {
    try {
        const { title, systemPrompt } = req.body;
        const chat = await chatService.createChat(req.userId, { title, systemPrompt });
        res.status(201).json(chat);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function getUserChats(req, res) {
    try {
        const chats = await chatService.getUserChats(req.userId);
        res.json(chats);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function getChat(req, res) {
    try {
        const { id } = req.params;
        const chat = await chatService.getChat(id, req.userId);
        res.json(chat);
    } catch (error) {
        const status = error.message === "Chat not found" ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
}

export async function updateChatTitle(req, res) {
    try {
        const { chatId } = req.params;
        const { title } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ error: 'Название не может быть пустым' });
        }

        const chat = await chatService.updateChatTitle(chatId, req.userId, title.trim());
        res.json(chat);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function deleteChat(req, res) {
    try {
        const { chatId } = req.params;
        await chatService.deleteChat(chatId, req.userId);
        res.status(204).send(); // 204 No Content — успех без тела ответа
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// ─── СООБЩЕНИЯ ───────────────────────────────────────────────────────────────

export async function getChatMessages(req, res) {
    try {
        const { chatId } = req.params;
        const messages = await chatService.getChatMessages(chatId, req.userId);
        res.json(messages);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function createMessage(req, res) {
    try {
        const { chatId } = req.params;
        const { role, content, model } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        const VALID_ROLES = ['user', 'assistant', 'system'];
        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `role должен быть одним из: ${VALID_ROLES.join(', ')}` });
        }

        const message = await chatService.createMessage(chatId, req.userId, {
            role,
            content: content.trim(),
            model,
        });

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function updateMessage(req, res) {
    try {
        const { chatId, messageId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        }

        const message = await chatService.updateMessage(
            messageId,
            chatId,
            req.userId,
            content.trim()
        );
        res.json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function deleteMessage(req, res) {
    try {
        const { chatId, messageId } = req.params;
        await chatService.deleteMessage(messageId, chatId, req.userId);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

async function getNextMessageOrder(chatId) {
    const last = await prisma.message.findFirst({
        where: { chatId },
        orderBy: { order: 'desc' },
        select: { order: true },
    });
    return (last?.order ?? -1) + 1;
}

export async function proxyChatRequest(req, res) {
    const { chatId, userId, userMessage, model, plugins, systemPrompt, isImageModel } = req.body;

    // Бэкенд сам достаёт историю из БД:
    const history = await prisma.message.findMany({
        where: { chatId, chat: { userId, deletedAt: null } },
        orderBy: { order: 'asc' },
        select: { role: true, content: true },
    });

    // Собираем messages для OpenRouter:
    const messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...history,
        { role: 'user', content: userMessage },
    ];

    // --- Валидация ---
    if (!chatId || !userId) {
        return res.status(400).json({ error: 'chatId and userId are required' });
    }
    if (!model || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'model and messages are required' });
    }

    // --- Проверка что чат принадлежит пользователю ---
    const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId, deletedAt: null },
    });
    if (!chat) {
        return res.status(403).json({ error: 'Chat not found or access denied' });
    }

    // --- Записываем сообщение пользователя ---
    if (!userMessage || userMessage.role !== 'user') {
        return res.status(400).json({ error: 'Last message must be from user' });
    }

    const userOrder = await getNextMessageOrder(chatId);
    await prisma.message.create({
        data: {
            chatId,
            role: 'user',
            content: typeof userMessage.content === 'string'
                ? userMessage.content
                : JSON.stringify(userMessage.content),
            order: userOrder,
        },
    });

    // --- Строим тело запроса для OpenRouter ---
    const allMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages,
    ];
    const body = {
        model,
        messages: allMessages,
        ...(isImageModel ? {} : { stream: true }),
        ...(plugins?.length ? { plugins: plugins.map((id) => ({ id })) } : {}),
    };

    // --- AbortController для отмены upstream при дисконнекте клиента ---
    const controller = new AbortController();
    req.on('close', () => controller.abort());

    let upstreamResponse;
    try {
        upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err) {
        if (err.name === 'AbortError') return res.end();
        return res.status(502).json({ error: 'Failed to reach upstream API' });
    }

    if (!upstreamResponse.ok) {
        const text = await upstreamResponse.text().catch(() => '');
        return res.status(upstreamResponse.status).json({
            error: `Upstream API error: ${upstreamResponse.status}`,
            detail: text,
        });
    }

    // ============================================================
    // IMAGE MODEL — не стрим, простой JSON
    // ============================================================
    if (isImageModel) {
        let data;
        try {
            data = await upstreamResponse.json();
        } catch {
            return res.status(502).json({ error: 'Failed to parse image response' });
        }

        const content = data.choices?.[0]?.message?.content ?? '';
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        const usage = data.usage ?? {};

        const assistantOrder = await getNextMessageOrder(chatId);
        await prisma.message.create({
            data: {
                chatId,
                role: 'assistant',
                content: text,
                model,
                inputTokens: usage.prompt_tokens ?? null,
                outputTokens: usage.completion_tokens ?? null,
                order: assistantOrder,
            },
        });

        return res.json(data);
    }

    // ============================================================
    // STREAMING — SSE proxy с аккумуляцией ответа
    // ============================================================
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let accumulated = '';
    let usage = null;

    try {
        for await (const rawChunk of upstreamResponse.body) {
            // Прокидываем чанк клиенту AS-IS
            res.write(rawChunk);

            // Параллельно парсим для БД
            const text = Buffer.isBuffer(rawChunk)
                ? rawChunk.toString('utf8')
                : new TextDecoder().decode(rawChunk);

            for (const line of text.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') continue;

                let parsed;
                try { parsed = JSON.parse(raw); } catch { continue; }

                // Аккумулируем текст
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === 'string') {
                    accumulated += delta;
                } else if (Array.isArray(delta)) {
                    for (const part of delta) {
                        if (part.type === 'text') accumulated += part.text;
                    }
                }

                // usage приходит в последнем чанке
                if (parsed.usage) usage = parsed.usage;
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            // Сообщаем клиенту об ошибке в SSE-формате
            res.write(`data: {"error":"Stream interrupted"}\n\n`);
        }
        res.end();
        return;
    }

    res.end();

    // --- Записываем ответ ассистента в БД (после завершения стрима) ---
    if (accumulated) {
        try {
            const assistantOrder = await getNextMessageOrder(chatId);
            await prisma.message.create({
                data: {
                    chatId,
                    role: 'assistant',
                    content: accumulated,
                    model,
                    inputTokens: usage?.prompt_tokens ?? null,
                    outputTokens: usage?.completion_tokens ?? null,
                    order: assistantOrder,
                },
            });
        } catch (err) {
            console.error('[proxyChatRequest] Failed to save assistant message:', err);
        }
    }
}