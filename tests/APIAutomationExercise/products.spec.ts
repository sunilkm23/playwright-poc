import { test, expect } from '@playwright/test';
import { ProductsApi } from '../../src/APIAutomationExercise/apiClients/productsApi';

test.describe('Products API', () => {
  test('GET /productsList returns 200 and an array', async ({ request }) => {
    const api = new ProductsApi(request);
    const response = await api.getAll();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.responseCode).toBe(200);
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test('POST /productsList returns 405 responseCode when not supported', async ({ request }) => {
    const api = new ProductsApi(request);
    const response = await api.post({});
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.responseCode).toBe(405);
  });
});
