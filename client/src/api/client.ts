type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

export function clearAccessToken() {
    accessToken = null;
}

let isRefreshing = false;
let refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];

export function processQueue(error: unknown, token: string | null = null) {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token!);
    });
    refreshQueue = [];
}

async function request<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
    let res = await fetch(`http://localhost:3000/api${path}`, {
        method,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !path.includes('auth')) {
        return handleTokenRefresh(path, method, body);
    }

    if (!res.ok) {
        const body = await res.json();
        if (body.fields) {
            throw new ApiError(body.error || 'Ошибка валидации', body.fields);
        }
        throw new ApiError(body.error || 'Неизвестная ошибка');
    }

    if (res.status === 204) return null as T;

    return res.json() as Promise<T>;
}

export async function handleTokenRefresh<T>(
    path: string,
    method: HttpMethod,
    body?: unknown
): Promise<T> {
    if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
            refreshQueue.push({
                resolve: (token) => {
                    accessToken = token;
                    resolve(request<T>(path, method, body));
                },
                reject,
            });
        });
    }

    isRefreshing = true;

    try {
        const refreshRes = await fetch("http://localhost:3000/api/auth/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (!refreshRes.ok) {
            window.location.href = "/login";
            throw new ApiError("Сессия истекла");
        }

        const { accessToken: newToken } = await refreshRes.json();
        setAccessToken(newToken);

        isRefreshing = false;
        processQueue(null, newToken);

        return request<T>(path, method, body);
    } catch (error) {
        isRefreshing = false;
        processQueue(error as Error, null);
        clearAccessToken();
        window.location.href = "/login";
        throw error;
    }
}

export class ApiError extends Error {
    fields?: Record<string, string>;

    constructor(message: string, fields?: Record<string, string>) {
        super(message);
        this.fields = fields;
    }
}

export const client = {
    get: <T>(path: string) => request<T>(path, "GET"),
    post: <T>(path: string, body: unknown) => request<T>(path, "POST", body),
    put: <T>(path: string, body: unknown) => request<T>(path, "PUT", body),
    patch: <T>(path: string, body: unknown) => request<T>(path, "PATCH", body),
    delete: <T>(path: string) => request<T>(path, "DELETE"),
};