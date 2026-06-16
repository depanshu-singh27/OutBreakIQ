import http from 'node:http';
import { randomBytes } from 'node:crypto';
const PORT = Number(process.env.PORT) || 3000;
const usersByEmail = new Map();
const accessByToken = new Map();
const refreshByToken = new Map();
const usersById = new Map();
function uid() {
    return randomBytes(12).toString('hex');
}
function token() {
    return randomBytes(32).toString('base64url');
}
function json(res, status, body, origin) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    res.writeHead(status, headers);
    res.end(JSON.stringify(body));
}
async function readBody(req) {
    const chunks = [];
    for await (const c of req)
        chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function issueTokens(userId) {
    const accessToken = token();
    const refreshToken = token();
    accessByToken.set(accessToken, userId);
    refreshByToken.set(refreshToken, userId);
    return { accessToken, refreshToken };
}
function revokeUserTokens(userId) {
    for (const [t, id] of [...accessByToken.entries()]) {
        if (id === userId)
            accessByToken.delete(t);
    }
    for (const [t, id] of [...refreshByToken.entries()]) {
        if (id === userId)
            refreshByToken.delete(t);
    }
}
const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '*';
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
    }
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    try {
        if (path === '/api/auth/register' && req.method === 'POST') {
            const body = await readBody(req);
            const fullName = String(body.fullName || '').trim();
            const email = String(body.email || '').trim().toLowerCase();
            const password = String(body.password || '');
            if (!fullName || !email || !password) {
                json(res, 400, { message: 'fullName, email, and password are required' }, origin);
                return;
            }
            if (usersByEmail.has(email)) {
                json(res, 409, { message: 'An account with this email already exists' }, origin);
                return;
            }
            const id = uid();
            const user = { id, email, fullName, password };
            usersByEmail.set(email, user);
            usersById.set(id, { id, email, fullName });
            const { accessToken, refreshToken } = issueTokens(id);
            json(res, 201, { user: { id, email, fullName }, accessToken, refreshToken }, origin);
            return;
        }
        if (path === '/api/auth/login' && req.method === 'POST') {
            const body = await readBody(req);
            const email = String(body.email || '').trim().toLowerCase();
            const password = String(body.password || '');
            const row = usersByEmail.get(email);
            if (!row || row.password !== password) {
                json(res, 401, { message: 'Invalid email or password' }, origin);
                return;
            }
            revokeUserTokens(row.id);
            const { accessToken, refreshToken } = issueTokens(row.id);
            const { id, fullName } = row;
            json(res, 200, { user: { id, email, fullName }, accessToken, refreshToken }, origin);
            return;
        }
        if (path === '/api/auth/me' && req.method === 'GET') {
            const auth = req.headers.authorization || '';
            const m = auth.match(/^Bearer\s+(.+)$/i);
            if (!m) {
                json(res, 401, { message: 'Missing token' }, origin);
                return;
            }
            const userId = accessByToken.get(m[1].trim());
            if (!userId) {
                json(res, 401, { message: 'Invalid or expired token' }, origin);
                return;
            }
            const user = usersById.get(userId);
            if (!user) {
                json(res, 401, { message: 'User not found' }, origin);
                return;
            }
            json(res, 200, { user }, origin);
            return;
        }
        if (path === '/api/auth/refresh' && req.method === 'POST') {
            const body = await readBody(req);
            const refreshToken = String(body.refreshToken || '');
            const userId = refreshByToken.get(refreshToken);
            if (!userId) {
                json(res, 401, { message: 'Invalid refresh token' }, origin);
                return;
            }
            refreshByToken.delete(refreshToken);
            for (const [t, id] of [...accessByToken.entries()]) {
                if (id === userId)
                    accessByToken.delete(t);
            }
            const accessToken = token();
            const newRefresh = token();
            accessByToken.set(accessToken, userId);
            refreshByToken.set(newRefresh, userId);
            json(res, 200, { accessToken, refreshToken: newRefresh }, origin);
            return;
        }
        json(res, 404, { message: 'Not found' }, origin);
    }
    catch (e) {
        json(res, 500, { message: e instanceof Error ? e.message : 'Server error' }, origin);
    }
});
server.listen(PORT, () => {
    console.log(`[cha-dev-api] http://127.0.0.1:${PORT} (auth: /api/auth/*)`);
});
