import { prisma } from '../prisma.js';

export async function createChat(userId, { title, systemPrompt } = {}) {
    const chat = await prisma.chat.create({
        data: {
            userId,
            title: title ?? 'New Chat',
            systemPrompt: systemPrompt ?? null,
        },
    });

    return chat;
}

export async function getUserChats(userId) {
    const chats = await prisma.chat.findMany({
        where: {
            userId,
            deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true,
            title: true,
            systemPrompt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return chats;
}

export async function getChat(chatId, userId) {
    const chat = await prisma.chat.findFirst({
        where: {
            id: chatId,
            userId,
            deletedAt: null,
        },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                include: {
                    attachments: {
                        select: {
                            id: true,
                            name: true,
                            mimeType: true,
                            isImage: true,
                            size: true,
                            data: true
                        },
                    },
                },
            },
        },
    });

    if (!chat) throw new Error("Chat not found");

    return chat;
}

export async function updateChatTitle(chatId, userId, title) {
    // Проверяем что чат принадлежит этому пользователю
    await assertChatOwnership(chatId, userId);

    const chat = await prisma.chat.update({
        where: { id: chatId },
        data: { title },
    });

    return chat;
}

export async function deleteChat(chatId, userId) {
    await assertChatOwnership(chatId, userId);

    await prisma.chat.delete({
        where: { id: chatId },
    });
}

// ─── СООБЩЕНИЯ ───────────────────────────────────────────────────────────────

export async function getChatMessages(chatId, userId) {
    await assertChatOwnership(chatId, userId);

    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { order: 'asc' },
        include: {
            attachments: {
                select: {
                    id: true,
                    name: true,
                    mimeType: true,
                    isImage: true,
                    size: true,
                    data: true
                },
            },
        },
    });

    console.log('[getChatMessages] total:', messages.length);
    console.log('[getChatMessages] attachments sample:', messages[0]?.attachments);

    return messages;
}

export async function createMessage(chatId, userId, { role, content, model, attachments }) {
    const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId, deletedAt: null },
    });

    if (!chat) throw new Error('Chat not found');

    return prisma.message.create({
        data: {
            chatId,
            role,
            content,
            model,
            attachments: attachments?.length
                ? {
                    create: attachments.map(({ name, mimeType, data, isImage, size }) => ({
                        name,
                        mimeType,
                        data,
                        isImage,
                        size,
                    })),
                }
                : undefined,
        },
        include: { attachments: true },
    });
}

export async function updateMessage(messageId, chatId, userId, content) {
    await assertChatOwnership(chatId, userId);

    // Проверяем что сообщение принадлежит этому чату
    const message = await prisma.message.findFirst({
        where: { id: messageId, chatId },
    });

    if (!message) {
        throw new Error('Сообщение не найдено');
    }

    // Редактировать можно только сообщения пользователя
    // Ответы нейросети — результат вычисления, не пользовательский контент
    if (message.role !== 'user') {
        throw new Error('Можно редактировать только свои сообщения');
    }

    return prisma.message.update({
        where: { id: messageId },
        data: { content },
    });
}

export async function removeMessageFromContext(messageId, chatId, userId) {
    await assertChatOwnership(chatId, userId);

    const message = await prisma.message.findFirst({
        where: { id: messageId, chatId },
    });

    if (!message) throw new Error('Сообщение не найдено');

    const newValue = !message.inContext; // ← toggle

    const nextMessage = await prisma.message.findFirst({
        where: { chatId, order: { gt: message.order }, role: 'assistant' },
        orderBy: { order: 'asc' },
    });

    // Обновляем оба в одной транзакции
    await prisma.$transaction([
        prisma.message.update({
            where: { id: messageId },
            data: { inContext: newValue },
        }),
        ...(nextMessage ? [
            prisma.message.update({
                where: { id: nextMessage.id },
                data: { inContext: newValue },
            }),
        ] : []),
    ]);
}

export async function deleteMessage(messageId, chatId, userId) {
    await assertChatOwnership(chatId, userId);

    const message = await prisma.message.findFirst({
        where: { id: messageId, chatId },
    });

    if (!message) {
        throw new Error('Сообщение не найдено');
    }

    await prisma.message.delete({ where: { id: messageId } });
}

// ─── ХЕЛПЕРЫ ─────────────────────────────────────────────────────────────────

/**
 * Проверяет что чат существует, не удалён и принадлежит userId.
 * Бросает ошибку если что-то не так.
 * Используется во всех операциях — чтобы не дублировать проверку везде.
 */
async function assertChatOwnership(chatId, userId) {
    const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId, deletedAt: null },
    });

    if (!chat) {
        // Намеренно не говорим "чат удалён" или "чужой чат" — это утечка информации
        throw new Error('Чат не найден');
    }

    return chat;
}