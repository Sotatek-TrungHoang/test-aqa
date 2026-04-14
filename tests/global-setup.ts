import fs from 'fs';
import path from 'path';
import { env } from '../src/config/environments';

const AUTH_DIR = path.join(process.cwd(), '.auth');

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: {
      id: number;
      email: string;
      name: string;
      role: string;
      portal: string;
      enterprise: {
        id: number;
        legalName: string;
        didHash: string;
        tier: string;
        status: string;
      };
    };
  };
}

/**
 * Login via API and write Playwright storage-state JSON directly.
 * Bypasses browser form submission (unreliable in test runner context)
 * to avoid Next.js server-action timing issues.
 */
async function cacheAuthState(email: string, password: string, outputFile: string): Promise<void> {
  // Call the login API (same endpoint the browser form uses)
  const res = await fetch(`${env.apiBaseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login API failed (${res.status}) for ${email}: ${body}`);
  }

  const json = (await res.json()) as LoginResponse;
  const { accessToken, user } = json.data;

  // Build Zustand auth state (matches enterprise-auth localStorage key)
  const enterpriseAuthState = JSON.stringify({
    state: { token: accessToken, user },
    version: 0,
  });

  // Cookie expires 24 hours from now (matches what the app sets)
  const cookieExpiry = Math.floor(Date.now() / 1000) + 86400;

  // Write Playwright storage state directly — no browser needed
  const storageState = {
    cookies: [
      {
        name: 'enterprise_token',
        value: accessToken,
        domain: new URL(env.baseURL).hostname,
        path: '/',
        expires: cookieExpiry,
        httpOnly: false,
        secure: env.baseURL.startsWith('https'),
        sameSite: 'Lax' as const,
      },
    ],
    origins: [
      {
        origin: env.baseURL,
        localStorage: [{ name: 'enterprise-auth', value: enterpriseAuthState }],
      },
    ],
  };

  fs.writeFileSync(outputFile, JSON.stringify(storageState, null, 2));
  console.log(`[globalSetup] Cached auth for ${email} → ${path.basename(outputFile)}`);
}

export default async function globalSetup(): Promise<void> {
  if (!env.testUser.email || !env.testUser.password) {
    console.warn(
      '[globalSetup] No credentials configured — skipping auth cache. Copy .env.example to .env.local and fill in real values.',
    );
    return;
  }

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Cache user and admin sessions
  await cacheAuthState(env.testUser.email, env.testUser.password, path.join(AUTH_DIR, 'user.json'));

  if (env.testAdmin.email && env.testAdmin.password) {
    await cacheAuthState(
      env.testAdmin.email,
      env.testAdmin.password,
      path.join(AUTH_DIR, 'admin.json'),
    );
  }
}
