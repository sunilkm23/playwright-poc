import { BaseApi } from './baseApi';
import { APIResponse } from '@playwright/test';

/**
 * Client for the Products API endpoints.
 */
export class ProductsApi extends BaseApi {
  /** GET /productsList */
  async getAll(): Promise<APIResponse> {
    return this.get('/productsList');
  }

  /** POST /productsList – endpoint does not support POST, but we expose it for completeness */
  async post(payload: any): Promise<APIResponse> {
    // Call the protected method from BaseApi to avoid recursion
    return super.post('/productsList', payload);
  }
}
