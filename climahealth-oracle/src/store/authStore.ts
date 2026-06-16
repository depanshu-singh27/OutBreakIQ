import { create } from 'zustand';
import type { AuthSessionPayload, AuthUser } from '../lib/authApi';
import { AUTH_ACCESS_KEY, AUTH_REFRESH_KEY, AuthHttpError, clearAuthTokens, loginRequest, meRequest, refreshRequest, registerRequest, } from '../lib/authApi';
export type AuthStoreState = {
    user: AuthUser | null;
    isLoading: boolean;
    isHydrating: boolean;
    isAuthenticated: boolean;
    showAuthModal: boolean;
};
export type AuthStoreActions = {
    loadUser: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (fullName: string, email: string, password: string) => Promise<void>;
    setUser: (user: AuthUser | null) => void;
    setSession: (payload: AuthSessionPayload) => void;
    logout: () => void;
    openAuthModal: () => void;
    closeAuthModal: () => void;
    setLoading: (v: boolean) => void;
    setHydrating: (v: boolean) => void;
};
export type AuthStore = AuthStoreState & AuthStoreActions;
function writeTokens(accessToken: string, refreshToken: string) {
    try {
        localStorage.setItem(AUTH_ACCESS_KEY, accessToken);
        localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
    }
    catch {
    }
}
export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    isLoading: false,
    isHydrating: true,
    isAuthenticated: false,
    showAuthModal: false,
    loadUser: async () => {
        set({ isLoading: true, isHydrating: true });
        const token = localStorage.getItem(AUTH_ACCESS_KEY);
        const refresh = localStorage.getItem(AUTH_REFRESH_KEY);
        if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false, isHydrating: false });
            return;
        }
        try {
            const user = await meRequest(token);
            set({ user, isAuthenticated: true, isLoading: false, isHydrating: false });
        }
        catch (e) {
            const status = e instanceof AuthHttpError ? e.status : 0;
            if (status === 401 && refresh) {
                try {
                    const next = await refreshRequest(refresh);
                    localStorage.setItem(AUTH_ACCESS_KEY, next.accessToken);
                    if (next.refreshToken)
                        localStorage.setItem(AUTH_REFRESH_KEY, next.refreshToken);
                    const user = await meRequest(next.accessToken);
                    set({ user, isAuthenticated: true, isLoading: false, isHydrating: false });
                    return;
                }
                catch {
                }
            }
            clearAuthTokens();
            set({ user: null, isAuthenticated: false, isLoading: false, isHydrating: false });
        }
    },
    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const payload = await loginRequest(email, password);
            writeTokens(payload.accessToken, payload.refreshToken);
            set({ user: payload.user, isAuthenticated: true, isLoading: false, showAuthModal: false });
        }
        catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },
    register: async (fullName, email, password) => {
        set({ isLoading: true });
        try {
            const payload = await registerRequest(fullName, email, password);
            writeTokens(payload.accessToken, payload.refreshToken);
            set({ user: payload.user, isAuthenticated: true, isLoading: false, showAuthModal: false });
        }
        catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },
    setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
    setSession: (payload) => {
        writeTokens(payload.accessToken, payload.refreshToken);
        set({ user: payload.user, isAuthenticated: true });
    },
    logout: () => {
        clearAuthTokens();
        set({ user: null, isAuthenticated: false, showAuthModal: false });
    },
    openAuthModal: () => set({ showAuthModal: true }),
    closeAuthModal: () => set({ showAuthModal: false }),
    setLoading: (isLoading) => set({ isLoading, isHydrating: isLoading }),
    setHydrating: (isHydrating) => set({ isHydrating, isLoading: isHydrating }),
}));
export function selectIsAuthenticated(s: AuthStore): boolean {
    return s.isAuthenticated;
}
