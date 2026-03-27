// controllers/chat.controller.js
import * as chatService from '../services/chat.service.js';
import { prisma } from '../prisma.js'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { getNextMessageOrder, saveAssistantMessage } from '../utils/saveAssistantMessage.js'
import { getRate } from '../constants/constants.js';
import { getCachedModels } from '../cache/modelsCache.js';

async function extractPdfText(buffer) {
    const doc = await getDocument({ data: buffer }).promise;
    const pages = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str).join(' '));
    }

    return pages.join('\n');
}

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
        const { chatId } = req.params;
        const chat = await chatService.getChat(chatId, req.userId);
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
        res.status(204).send();
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

function buildUserMessageContent(text, attachments) {
    if (!attachments?.length) return text;

    const parts = [{ type: 'text', text }];

    for (const a of attachments) {
        if (a.extractedText) {
            parts.push({
                type: 'text',
                text: `[Документ: ${a.name}]\n\n${a.extractedText}`,
            });
        } else if (a.isImage) {
            parts.push({
                type: 'image_url',
                image_url: { url: a.data },
            });
        }
    }

    return parts;
}

export async function createMessage(req, res) {
    const { chatId } = req.params;
    const { role, userId, content, model, price, maxTokens, contextLimit, modelName, attachments, systemPrompt, plugins, isImageModel } = req.body;

    if (!content?.trim()) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const VALID_ROLES = ['user', 'assistant', 'system'];
    if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `role должен быть одним из: ${VALID_ROLES.join(', ')}` });
    }

    if (attachments !== undefined) {
        if (!Array.isArray(attachments)) {
            return res.status(400).json({ error: 'attachments должен быть массивом' });
        }
        if (attachments.length > 10) {
            return res.status(400).json({ error: 'Максимум 10 файлов' });
        }
        for (const a of attachments) {
            if (!a.name || !a.mimeType || !a.data || typeof a.isImage !== 'boolean') {
                return res.status(400).json({ error: 'Некорректный формат вложения' });
            }
            if (a.size > 10 * 1024 * 1024) {
                return res.status(400).json({ error: `Файл ${a.name} превышает 10MB` });
            }
        }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.balance < 10 && isImageModel) {
        return res.status(400).json({ error: 'Недостаточно средств для генерации изображения. Необходимо иметь на балансе больше 10 руб.' });
    }

    if (user.balance < 100 && model.includes('research')) {
        return res.status(400).json({ error: 'Недостаточно средств для исследования. Необходимо иметь на балансе больше 100 руб.' });
    }

    const chat = await chatService.getChat(chatId, userId);
    if (!chat) {
        return res.status(403).json({ error: 'Chat not found or access denied' });
    }

    if (!model) {
        return res.status(400).json({ error: 'model is required for user messages' });
    }

    // ── Создаём controller ДО любых await ────────────────────────
    const controller = new AbortController();
    const abort = () => {
        if (!controller.signal.aborted) {
            controller.abort();
        }
    };

    req.on('close', abort);
    req.on('error', abort);
    res.on('close', abort);  // ← res.close надёжнее req.close при SSE
    res.on('finish', () => console.log('[res finish]'));

    const userOrder = await getNextMessageOrder(chatId);

    const history = await prisma.message.findMany({
        where: {
            chatId,
            inContext: true,
        },
        orderBy: { createdAt: 'asc' },
        select: {
            role: true,
            content: true,
            attachments: {
                select: {
                    name: true,
                    mimeType: true,
                    data: true,
                    isImage: true,
                    extractedText: true,
                },
            },
        },
    });

    console.log(history)

    const processedAttachments = [];
    for (const a of (attachments ?? [])) {
        if (a.mimeType === 'application/pdf') {
            try {
                const base64 = a.data.split(',')[1];
                const buffer = new Uint8Array(Buffer.from(base64, 'base64'));
                const text = await extractPdfText(buffer);
                processedAttachments.push({ ...a, extractedText: text, isDocument: true });
            } catch (err) {
                console.error(`[PDF parse error] ${a.name}:`, err.message);
                processedAttachments.push(a);
            }
        } else {
            processedAttachments.push(a);
        }
    }

    const modelMeta = getCachedModels()?.find(m => m.id === model);

    const supportsVision = modelMeta?.architecture?.input_modalities?.includes('image') ?? false;
    const userContent = supportsVision
        ? buildUserMessageContent(content.trim(), processedAttachments)
        : content.trim();

    let sortedHistory = [...history].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const allHistory = sortedHistory.map((msg) => ({
        role: msg.role,
        content: msg.attachments?.length && supportsVision
            ? buildUserMessageContent(msg.content, msg.attachments)
            : msg.content,
    }));

    const historyForAI = contextLimit
        ? allHistory.slice(- (contextLimit * 2)) // берем последние N пар сообщений
        : allHistory;

    const messagesForAI = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...historyForAI,
        { role: 'user', content: userContent },
    ];

    const requestBody = {
        model,
        messages: messagesForAI,
        maxTokens: maxTokens !== null ? maxTokens : 32768,
        ...(isImageModel ? {} : { stream: true }),
        ...(plugins?.length ? { plugins: plugins.map((id) => ({ id })) } : {}),
    };

    console.log('[requestBody]', JSON.stringify(requestBody, null, 2));

    // ── Если клиент уже отключился пока мы возились с БД ─────────
    if (controller.signal.aborted) return res.end();

    let upstreamResponse;
    try {
        upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    } catch (err) {
        if (err.name === 'AbortError') return res.end();
        return res.status(502).json({ error: 'Failed to reach upstream API' });
    }

    if (!upstreamResponse.ok) {
        const text = await upstreamResponse.text().catch(() => '');
        console.error('[OpenRouter error]', upstreamResponse.status, text);
        return res.status(upstreamResponse.status).json({
            error: `Upstream API error: ${upstreamResponse.status}`,
            detail: text,
        });
    }

    // ── Image model ───────────────────────────────────────────────
    if (isImageModel) {
        let data;
        try {
            data = await upstreamResponse.json();
        } catch {
            return res.status(502).json({ error: 'Failed to parse image response' });
        }

        const responseContent = data.choices?.[0]?.message?.content ?? '';
        const text = typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent);
        const usage = data.usage ?? {};

        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        let imageAttachment = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const mimeType = imgRes.headers.get('content-type') ?? 'image/png';
                const buffer = await imgRes.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');

                imageAttachment = {
                    name: `generated-${Date.now()}.png`,
                    mimeType,
                    data: `data:${mimeType};base64,${base64}`,
                    isImage: true,
                    size: buffer.byteLength,
                };
            } catch (err) {
                console.error('[image download error]', err.message);
            }
        }

        const assistantOrder = await getNextMessageOrder(chatId);
        const costUSD = usage.cost ?? 0;
        const rateWithMarkup = getRate();
        const costRub = costUSD * rateWithMarkup;

        const userMessage = await prisma.message.create({
            data: {
                chatId,
                role: 'user',
                content: content.trim(),
                order: userOrder,
                attachments: processedAttachments?.length
                    ? {
                        create: processedAttachments.map(a => ({
                            name: a.name,
                            mimeType: a.mimeType,
                            data: a.data,
                            isImage: a.isImage,
                            size: a.size,
                            extractedText: a.extractedText,
                        })),
                    }
                    : undefined,
            }
        })

        const assistantMsg = await prisma.message.create({
            data: {
                chatId,
                role: 'assistant',
                content: text,
                cost: costUSD,
                rubPrice: costRub,
                model,
                modelName,
                inputTokens: usage.prompt_tokens ?? null,
                outputTokens: usage.completion_tokens ?? null,
                order: assistantOrder,
                hasAttachments: !!imageAttachment,
                attachments: imageAttachment
                    ? { create: imageAttachment }
                    : undefined,
            },
        });

        const newBalance = await prisma.user.update({
            where: { id: userId },
            data: {
                balanceUSD: { decrement: costUSD },
                balance: { decrement: costRub },
                amountOfQueries: { increment: 1 },
            },
            select: { balance: true, balanceUSD: true },
        })

        return res.json({ ...data, userMessageId: userMessage.id, assistantMessageId: assistantMsg.id, balance: newBalance.balance, balanceUSD: newBalance.balanceUSD });
    }

    // ── SSE stream ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let accumulated = '';
    let usage = null;

    const reader = upstreamResponse.body.getReader();
    const onAbort = () => {
        reader.cancel().catch(() => { });
    };

    controller.signal.addEventListener('abort', onAbort);

    await (async () => {
        try {
            while (true) {
                if (controller.signal.aborted) break;

                let result;
                try {
                    result = await reader.read();
                } catch {
                    break; // AbortError от reader.cancel() — выходим
                }

                if (result.done) break;

                const rawChunk = Buffer.from(result.value);
                res.write(rawChunk);

                const chunkText = rawChunk.toString('utf8');

                for (const line of chunkText.split('\n')) {
                    if (!line.startsWith('data: ')) continue;
                    const raw = line.slice(6).trim();
                    if (raw === '[DONE]') continue;

                    let parsed;
                    try { parsed = JSON.parse(raw); } catch { continue; }

                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string') {
                        accumulated += delta;
                    } else if (Array.isArray(delta)) {
                        for (const part of delta) {
                            if (part.type === 'text') accumulated += part.text;
                        }
                    }

                    if (parsed.usage) usage = parsed.usage;
                }
            }
        } catch {
            if (!res.writableEnded) {
                res.write(`data: {"error":"Stream interrupted"}\n\n`);
            }
        } finally {
            controller.signal.removeEventListener('abort', onAbort);
            reader.cancel().catch(() => { });
        }
    })().catch(() => { });

    const newBalance = await saveAssistantMessage({
        chatId, userId, accumulated, usage, model, modelName,
        messagesForAI,
        aborted: controller.signal.aborted,
        price: {
            income: price.income,
            outcome: price.outcome,
        },
        userMessage: {
            chatId,
            role: 'user',
            content: content.trim(),
            order: userOrder,
            attachments: processedAttachments?.length
                ? {
                    create: processedAttachments.map(a => ({
                        name: a.name,
                        mimeType: a.mimeType,
                        data: a.data,
                        isImage: a.isImage,
                        size: a.size,
                        extractedText: a.extractedText,
                    })),
                }
                : undefined,
        }
    });

    if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done', userMessageId: newBalance.userMessageId, balance: newBalance.balance, balanceUSD: newBalance.balanceUSD })}\n\n`);
        res.end();
    }
}

export async function removeMessageFromContext(req, res) {
    try {
        const { chatId, messageId } = req.params;
        console.log(messageId, chatId, req.userId)
        await chatService.removeMessageFromContext(messageId, chatId, req.userId);
        res.status(204).send();
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