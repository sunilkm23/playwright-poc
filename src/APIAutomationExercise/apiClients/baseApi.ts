import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Base class that holds the Playwright API request context and the base URL.
 * All concrete API client classes extend this to get helper methods.
 */
export class BaseApi {
  protected request: APIRequestContext;
  protected basePath: string;

  constructor(request: APIRequestContext, basePath: string = '/api') {
    this.request = request;
    this.basePath = basePath;
  }

  private serializeBody(data: any) {
    const body = data instanceof URLSearchParams ? data.toString() : new URLSearchParams(data).toString();
    return {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: body,
    };
  }

  protected async get(path: string): Promise<APIResponse> {
    return await this.request.get(`${this.basePath}${path}`);
  }

  protected async post(path: string, data: any): Promise<APIResponse> {
    return await this.request.post(`${this.basePath}${path}`, this.serializeBody(data));
  }

  protected async put(path: string, data: any): Promise<APIResponse> {
    return await this.request.put(`${this.basePath}${path}`, this.serializeBody(data));
  }

  protected async delete(path: string, data?: any): Promise<APIResponse> {
    return await this.request.delete(`${this.basePath}${path}`, data ? this.serializeBody(data) : {});
  }
}
