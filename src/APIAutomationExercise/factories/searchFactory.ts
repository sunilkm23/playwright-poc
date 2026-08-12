import { SearchPayload } from '../types/apiTypes';

/**
 * Factory for building the payload for the Search Product API.
 */
export function buildSearchPayload(search_product: string = 'tshirt'): SearchPayload {
  return { search_product };
}
