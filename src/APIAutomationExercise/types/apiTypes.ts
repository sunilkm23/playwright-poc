/**
 * Type definitions for API Automation Exercise payloads and API client interfaces.
 */

export interface UserPayload {
  name: string;
  email: string;
  password: string;
  title?: string;
  birth_date?: string;
  birth_month?: string;
  birth_year?: string;
  firstname: string;
  lastname: string;
  company?: string;
  address1: string;
  address2?: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
}

export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface SearchPayload {
  search_product?: string;
}
