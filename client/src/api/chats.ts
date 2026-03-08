import { Chat } from "../types";
import { client } from "./client";

interface ChatProps {
    title: string;
    systemPrompt: string;
}

export interface ChatResponse {
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    systemPrompt: string | null;
    deletedAt: Date | null;
}

export const chatApi = {
    newChat: (data: ChatProps) => client.post<ChatResponse>("/chats", data),
    getChats: () => client.get<ChatResponse[]>("/chats"),
    getChat: (chatId: string) => client.get<Chat>(`/chats/${chatId}`),
};