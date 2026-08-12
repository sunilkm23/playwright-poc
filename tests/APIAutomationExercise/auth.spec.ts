import { test, expect } from '@playwright/test';
import { AuthApi } from '../../src/APIAutomationExercise/apiClients/authApi';
import { UserApi } from '../../src/APIAutomationExercise/apiClients/userApi';
import { buildLoginPayload } from '../../src/APIAutomationExercise/factories/loginFactory';
import { buildUserPayload } from '../../src/APIAutomationExercise/factories/userFactory';

test.describe('Auth / VerifyLogin API', () => {
  test('POST with valid credentials returns 200 and user exists', async ({ request }) => {
    const userApi = new UserApi(request);
    const newUser = buildUserPayload({ email: `login+${Date.now()}@example.com`, password: 'ValidPass123' });
    const createResponse = await userApi.createAccount(newUser);
    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.responseCode).toBe(201);

    try {
      const api = new AuthApi(request);
      const response = await api.verifyLogin(buildLoginPayload(newUser.email, newUser.password));
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.responseCode).toBe(200);
      expect(body.message).toContain('User exists');
    } finally {
      const deleteResponse = await userApi.deleteAccount({ email: newUser.email, password: newUser.password });
      expect(deleteResponse.status()).toBe(200);
      const deleteBody = await deleteResponse.json();
      expect(deleteBody.responseCode).toBe(200);
    }
  });

  test('POST without email returns 400 responseCode', async ({ request }) => {
    const api = new AuthApi(request);
    const response = await api.verifyLogin({ password: 'any' });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(400);
  });

  test('POST without password returns 400 responseCode', async ({ request }) => {
    const api = new AuthApi(request);
    const response = await api.verifyLogin({ email: 'any@example.com' });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(400);
  });

  test('POST with invalid credentials returns 404 responseCode', async ({ request }) => {
    const api = new AuthApi(request);
    const payload = buildLoginPayload('nonexistent@example.com', 'wrong');
    const response = await api.verifyLogin(payload);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(404);
  });

  test('DELETE returns 405 responseCode (method not allowed)', async ({ request }) => {
    const api = new AuthApi(request);
    const response = await api.delete();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(405);
  });
});
