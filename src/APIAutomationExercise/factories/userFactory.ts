import { faker } from '@faker-js/faker';
import { UserPayload } from '../types/apiTypes';

/**
 * Generates a payload for creating a new user account.
 * All fields are optional – callers can override via the `overrides` argument.
 */
export function buildUserPayload(overrides: Partial<UserPayload> = {}): UserPayload {
  const defaultPayload = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    title: 'Mr',
    birth_date: '01',
    birth_month: 'January',
    birth_year: '1990',
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    company: faker.company.name(),
    address1: faker.location.streetAddress(),
    address2: '',
    country: 'United States',
    zipcode: faker.location.zipCode('#####'),
    state: faker.location.state(),
    city: faker.location.city(),
    mobile_number: faker.phone.number('##########'),
  };
  return { ...defaultPayload, ...overrides };
}
