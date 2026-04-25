import { User } from "../types";
import { client } from "./client";

interface LoginPayload { email: string; password: string }
interface RegisterPayload extends LoginPayload { name: string, promo: string }
interface AuthResponse { accessToken: string; message: string; }
interface MessageResponse { message: string; }

export interface UserStats {
    createdAt: string;
    messageCount: number;
    totalTokens: number;
    spentRub: number;
    favoriteModel: string;
    uniqueModelsUsed: number;
}

export const authApi = {
    login: (data: LoginPayload) => client.post<AuthResponse>("/auth/login", data),
    register: (data: RegisterPayload) => client.post<AuthResponse>("/auth/register", data),
    me: () => client.get<User>("/auth/me"),
    updateMe: (data: { name?: string; systemPrompt?: string }) => client.patch<User>("/auth/me", data),
    refresh: () => client.post<AuthResponse>("/auth/refresh", {}),
    logout: () => client.post("/auth/logout", {}),
    forgotPassword: (email: string) => client.post<MessageResponse>("/auth/forgot-password", { email }),
    resetPassword: (token: string, newPassword: string) => client.post<MessageResponse>("/auth/reset-password", { token, newPassword }),
    getStats: () => client.get<UserStats>("/auth/me/stats"),
};