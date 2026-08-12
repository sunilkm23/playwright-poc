import { BaseApi } from './baseApi';
import { APIResponse } from '@playwright/test';
import { LoginPayload } from '../types/apiTypes';

/**
 * Client for the Verify Login API.
 */
export class AuthApi extends BaseApi {
  /** POST /verifyLogin */
  async verifyLogin(payload: LoginPayload): Promise<APIResponse> {
    return this.post('/verifyLogin', payload);
  }

  /** DELETE /verifyLogin – not supported */
  async delete(): Promise<APIResponse> {
    // Use the protected delete method from BaseApi to avoid recursion
    return super.delete('/verifyLogin');
  }
}
