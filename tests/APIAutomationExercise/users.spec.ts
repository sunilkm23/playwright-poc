import { test, expect } from '@playwright/test';
import { UserApi } from '../../src/APIAutomationExercise/apiClients/userApi';
import { buildUserPayload } from '../../src/APIAutomationExercise/factories/userFactory';

let createdUser: Record<string, any> = {};

test.describe.serial('User Account API', () => {
  test('POST /createAccount creates a new user (201)', async ({ request }) => {
    const api = new UserApi(request);
    createdUser = buildUserPayload();
    const response = await api.createAccount(createdUser);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(201);
    expect(body.message).toContain('User created');
  });

  test('GET /getUserDetailByEmail returns 200 with user data', async ({ request }) => {
    const api = new UserApi(request);
    const response = await api.getDetailByEmail(createdUser.email);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(body.user.email).toBe(createdUser.email);
  });

  test('PUT /updateAccount updates the user (200)', async ({ request }) => {
    const api = new UserApi(request);
    const updatedPayload = { ...createdUser, firstname: 'Updated' };
    const response = await api.updateAccount(updatedPayload);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
  });

  test('DELETE /deleteAccount deletes the user (200)', async ({ request }) => {
    const api = new UserApi(request);
    const response = await api.deleteAccount({ email: createdUser.email, password: createdUser.password });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(body.message).toContain('Account deleted');
  });
});
