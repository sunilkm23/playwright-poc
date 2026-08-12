import { test, expect } from '@playwright/test';
import { BrandsApi } from '../../src/APIAutomationExercise/apiClients/brandsApi';

test.describe('Brands API', () => {
  test('GET /brandsList returns 200 and an array', async ({ request }) => {
    const api = new BrandsApi(request);
    const response = await api.getAll();
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.responseCode).toBe(200);
    expect(Array.isArray(data.brands)).toBeTruthy();
  });

  test('PUT /brandsList returns 405 responseCode when not supported', async ({ request }) => {
    const api = new BrandsApi(request);
    const response = await api.put({});
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.responseCode).toBe(405);
  });
});
