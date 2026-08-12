import { test, expect } from '@playwright/test';
import { SearchApi } from '../../src/APIAutomationExercise/apiClients/searchApi';
import { buildSearchPayload } from '../../src/APIAutomationExercise/factories/searchFactory';

test.describe('Search Product API', () => {
  test('POST with valid search_product returns 200 and product results', async ({ request }) => {
    const api = new SearchApi(request);
    const payload = buildSearchPayload('tshirt');
    const response = await api.search(payload);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.responseCode).toBe(200);
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test('POST without search_product returns 400 responseCode', async ({ request }) => {
    const api = new SearchApi(request);
    const response = await api.search({});
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toContain('search_product parameter is missing');
  });
});
