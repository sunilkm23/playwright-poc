import { LoginPayload } from '../types/apiTypes';

/**
 * Simple factory for building a login payload.
 */
export function buildLoginPayload(email: string, password: string): LoginPayload {
  return { email, password };
}
