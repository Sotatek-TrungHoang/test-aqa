import { ApiClient } from '@api/api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Typed wrapper for /users API endpoints */
export class UsersEndpoint {
  constructor(private readonly client: ApiClient) {}

  async getAll(): Promise<User[]> {
    return this.client.get<User[]>('/users');
  }

  async getById(id: string): Promise<User> {
    return this.client.get<User>(`/users/${id}`);
  }

  async create(payload: CreateUserPayload): Promise<User> {
    return this.client.post<User>('/users', payload);
  }

  async delete(id: string): Promise<void> {
    return this.client.delete(`/users/${id}`);
  }
}
