import { BaseApi } from './baseApi';
import { APIResponse } from '@playwright/test';
import { UserPayload, LoginPayload } from '../types/apiTypes';

/**
 * Client for user‑account related endpoints.
 */
export class UserApi extends BaseApi {
  /** POST /createAccount */
  async createAccount(payload: UserPayload): Promise<APIResponse> {
    return this.post('/createAccount', payload);
  }

  /** GET /getUserDetailByEmail?email=... */
  async getDetailByEmail(email: string): Promise<APIResponse> {
    // API expects the email as a query parameter
    return this.get(`/getUserDetailByEmail?email=${encodeURIComponent(email)}`);
  }

  /** PUT /updateAccount */
  async updateAccount(payload: Partial<UserPayload>): Promise<APIResponse> {
    return this.put('/updateAccount', payload);
  }

  /** DELETE /deleteAccount */
  async deleteAccount(payload: LoginPayload): Promise<APIResponse> {
    return this.delete('/deleteAccount', payload);
  }
}
