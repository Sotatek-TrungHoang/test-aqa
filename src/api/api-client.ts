import { APIRequestContext, APIResponse } from '@playwright/test';

interface ApiClientOptions {
  baseURL: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiClient {
  private readonly baseURL: string;
  private headers: Record<string, string>;

  constructor(
    private readonly request: APIRequestContext,
    options: ApiClientOptions,
  ) {
    this.baseURL = options.baseURL;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  setAuthToken(token: string): void {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  async get<T = unknown>(endpoint: string): Promise<T> {
    const res = await this.request.get(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
    });
    return this.parseResponse<T>(res);
  }

  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const res = await this.request.post(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
      data,
    });
    return this.parseResponse<T>(res);
  }

  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const res = await this.request.put(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
      data,
    });
    return this.parseResponse<T>(res);
  }

  async delete(endpoint: string): Promise<void> {
    const res = await this.request.delete(`${this.baseURL}${endpoint}`, {
      headers: this.headers,
    });
    if (!res.ok()) throw new Error(`DELETE ${endpoint} failed: ${res.status()}`);
  }

  private async parseResponse<T>(res: APIResponse): Promise<T> {
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`API ${res.status()}: ${body}`);
    }
    return res.json() as Promise<T>;
  }
}
