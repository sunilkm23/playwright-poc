import { BaseApi } from './baseApi';
import { APIResponse } from '@playwright/test';
import { SearchPayload } from '../types/apiTypes';

/**
 * Client for the Search Product API.
 */
export class SearchApi extends BaseApi {
  /** POST /searchProduct */
  async search(payload: SearchPayload): Promise<APIResponse> {
    return this.post('/searchProduct', payload);
  }
}
