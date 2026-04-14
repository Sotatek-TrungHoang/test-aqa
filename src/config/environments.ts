import dotenv from 'dotenv';
import path from 'path';

// Load .env.local only — copy .env.example to .env.local and fill in real values
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export interface EnvConfig {
  baseURL: string;
  apiBaseURL: string;
  testUser: { email: string; password: string };
  testAdmin: { email: string; password: string };
}

export const env: EnvConfig = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiBaseURL: process.env.API_BASE_URL || 'http://localhost:3001/api',
  testUser: {
    email: process.env.TEST_USER_EMAIL || '',
    password: process.env.TEST_USER_PASSWORD || '',
  },
  testAdmin: {
    email: process.env.TEST_ADMIN_EMAIL || '',
    password: process.env.TEST_ADMIN_PASSWORD || '',
  },
};
