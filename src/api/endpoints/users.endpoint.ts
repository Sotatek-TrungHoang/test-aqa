import { ApiClient } from '@api/api-client';

/** Matches the actual API response shape: { success, message, data } */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  enterpriseId: number;
  createdAt: string;
  updatedAt: string;
}

/** Typed wrapper for /users API endpoints */
export class UsersEndpoint {
  constructor(private readonly client: ApiClient) {}

  async getAll(): Promise<User[]> {
    const res = await this.client.get<ApiResponse<User[]>>('/users');
    return res.data;
  }

  async getById(id: number): Promise<User> {
    const res = await this.client.get<ApiResponse<User>>(`/users/${id}`);
    return res.data;
  }
}
