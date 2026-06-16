const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
function url(path: string): string {
    return `${API_BASE}${path}`;
}
async function readJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    if (!text)
        return {};
    try {
        return JSON.parse(text) as Record<string, unknown>;
    }
    catch {
        return { message: text };
    }
}
function errMessage(data: Record<string, unknown>, fallback: string): string {
    const m = data.message ?? data.error;
    return typeof m === 'string' ? m : fallback;
}
export type AuthUser = {
    id: string;
    email: string;
    fullName: string;
};
export type AuthSessionPayload = {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
};
export function parseUser(raw: unknown): AuthUser | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '');
    const email = String(o.email ?? '');
    const fullName = String(o.fullName ?? o.name ?? '');
    if (!id || !email)
        return null;
    return { id, email, fullName: fullName || email.split('@')[0] || 'User' };
}
export async function loginRequest(email: string, password: string): Promise<AuthSessionPayload> {
    const res = await fetch(url('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    if (!res.ok)
        throw new Error(errMessage(data, 'Sign in failed'));
    const user = parseUser(data.user);
    const accessToken = String(data.accessToken ?? '');
    const refreshToken = String(data.refreshToken ?? '');
    if (!user || !accessToken || !refreshToken)
        throw new Error('Invalid response from server');
    return { user, accessToken, refreshToken };
}
export async function registerRequest(fullName: string, email: string, password: string): Promise<AuthSessionPayload> {
    const res = await fetch(url('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
    });
    const data = await readJson(res);
    if (!res.ok)
        throw new Error(errMessage(data, 'Registration failed'));
    const user = parseUser(data.user);
    const accessToken = String(data.accessToken ?? '');
    const refreshToken = String(data.refreshToken ?? '');
    if (!user || !accessToken || !refreshToken)
        throw new Error('Invalid response from server');
    return { user, accessToken, refreshToken };
}
export class AuthHttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}
export async function meRequest(accessToken: string): Promise<AuthUser> {
    const res = await fetch(url('/api/auth/me'), {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await readJson(res);
    if (!res.ok) {
        throw new AuthHttpError(res.status, errMessage(data, res.status === 401 ? 'Unauthorized' : 'Request failed'));
    }
    const rawUser = data.user ?? data;
    const user = parseUser(rawUser);
    if (!user)
        throw new AuthHttpError(res.status, 'Invalid profile response');
    return user;
}
export type RefreshResult = {
    accessToken: string;
    refreshToken?: string;
};
export async function refreshRequest(refreshToken: string): Promise<RefreshResult> {
    const res = await fetch(url('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    const data = await readJson(res);
    if (!res.ok)
        throw new Error(errMessage(data, 'Session refresh failed'));
    const accessToken = String(data.accessToken ?? '');
    if (!accessToken)
        throw new Error('Invalid refresh response');
    const nextRefresh = data.refreshToken != null ? String(data.refreshToken) : undefined;
    return { accessToken, refreshToken: nextRefresh };
}
export const AUTH_ACCESS_KEY = 'cha_access_token';
export const AUTH_REFRESH_KEY = 'cha_refresh_token';
export function clearAuthTokens() {
    try {
        localStorage.removeItem(AUTH_ACCESS_KEY);
        localStorage.removeItem(AUTH_REFRESH_KEY);
    }
    catch {
    }
}
