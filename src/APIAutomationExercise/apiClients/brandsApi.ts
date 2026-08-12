import { BaseApi } from './baseApi';
import { APIResponse } from '@playwright/test';

/**
 * Client for the Brands API endpoints.
 */
export class BrandsApi extends BaseApi {
  /** GET /brandsList */
  async getAll(): Promise<APIResponse> {
    return this.get('/brandsList');
  }

  /** PUT /brandsList – not supported, but method is provided for completeness */
  async put(payload: any): Promise<APIResponse> {
    // Use BaseApi's protected method to avoid recursive call
    return super.put('/brandsList', payload);
  }
}
