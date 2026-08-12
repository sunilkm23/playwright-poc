/* eslint-disable @typescript-eslint/no-explicit-any */
import * as https from 'node:https';
import * as http from 'node:http';
import { URL } from 'node:url';
import type { QTestConfig } from '../config/qtestConfig.js';

export interface QTestResponse<T = any> {
  statusCode: number;
  ok: boolean;
  body: T;
  raw: string;
}

/**
 * Minimal qTest REST client.
 *
 * Wraps GET/POST against `${baseUrl}/projects/${projectId}/...` with bearer
 * authentication. Uses only Node built-ins (no extra dependencies) so it works
 * identically locally and in CI.
 */
export class QTestClient {
  constructor(private readonly cfg: QTestConfig) {}

  /** Base path prefix for all project-scoped endpoints. */
  private projectPath(path: string): string {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.cfg.baseUrl}/projects/${this.cfg.projectId}${clean}`;
  }

  async get<T = any>(path: string): Promise<QTestResponse<T>> {
    return this.request<T>('GET', this.projectPath(path));
  }

  async post<T = any>(path: string, body: unknown): Promise<QTestResponse<T>> {
    return this.request<T>('POST', this.projectPath(path), body);
  }

  async put<T = any>(path: string, body: unknown): Promise<QTestResponse<T>> {
    return this.request<T>('PUT', this.projectPath(path), body);
  }

  /** POST to an absolute (non project-scoped) path, e.g. /search. */
  async postAbsolute<T = any>(path: string, body: unknown): Promise<QTestResponse<T>> {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return this.request<T>('POST', `${this.cfg.baseUrl}${clean}`, body);
  }

  private request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<QTestResponse<T>> {
    const u = new URL(url);
    const payload = body !== undefined ? Buffer.from(JSON.stringify(body)) : undefined;
    const transport = u.protocol === 'http:' ? http : https;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.apiToken}`,
      Accept: 'application/json',
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(payload.length);
    }

    return new Promise<QTestResponse<T>>((resolve, reject) => {
      const req = transport.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method,
          headers,
          port: u.port || (u.protocol === 'http:' ? 80 : 443),
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8');
            const statusCode = res.statusCode ?? 0;
            let parsed: any = undefined;
            try {
              parsed = raw ? JSON.parse(raw) : undefined;
            } catch {
              parsed = raw;
            }
            resolve({
              statusCode,
              ok: statusCode >= 200 && statusCode < 300,
              body: parsed as T,
              raw,
            });
          });
        },
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}
