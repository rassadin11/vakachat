import { User } from "../types";
import { client } from "./client";

interface LoginPayload { email: string; password: string }
interface RegisterPayload extends LoginPayload { name: string }
interface AuthResponse { accessToken: string; }

export const authApi = {
    login: (data: LoginPayload) => client.post<AuthResponse>("/auth/login", data),
    register: (data: RegisterPayload) => client.post<AuthResponse>("/auth/register", data),
    me: () => client.get<User>("/auth/me"),
    refresh: () => client.post<AuthResponse>("/auth/refresh", {}),
    logout: () => client.post("/auth/logout", {}),
};