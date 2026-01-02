/**
 * TaxJar API Client
 * Provides sales tax calculation based on shipping destination
 * https://developers.taxjar.com/api/reference/
 */

import { getEnv, features } from '@/lib/env';

const TAXJAR_API_URL = 'https://api.taxjar.com/v2';
const TAXJAR_SANDBOX_URL = 'https://api.sandbox.taxjar.com/v2';

export interface TaxJarAddress {
  country: string;
  zip: string;
  state: string;
  city?: string;
  street?: string;
}

export interface TaxJarLineItem {
  id?: string;
  quantity: number;
  product_tax_code?: string;
  unit_price: number;
  discount?: number;
}

export interface TaxJarTaxRequest {
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country: string;
  to_zip: string;
  to_state: string;
  to_city?: string;
  to_street?: string;
  amount?: number;
  shipping: number;
  line_items?: TaxJarLineItem[];
  nexus_addresses?: TaxJarAddress[];
}

export interface TaxJarTaxResponse {
  tax: {
    order_total_amount: number;
    shipping: number;
    taxable_amount: number;
    amount_to_collect: number;
    rate: number;
    has_nexus: boolean;
    freight_taxable: boolean;
    tax_source: string;
    jurisdictions?: {
      country: string;
      state: string;
      county?: string;
      city?: string;
    };
    breakdown?: {
      taxable_amount: number;
      tax_collectable: number;
      combined_tax_rate: number;
      state_taxable_amount?: number;
      state_tax_rate?: number;
      state_tax_collectable?: number;
      county_taxable_amount?: number;
      county_tax_rate?: number;
      county_tax_collectable?: number;
      city_taxable_amount?: number;
      city_tax_rate?: number;
      city_tax_collectable?: number;
      special_district_taxable_amount?: number;
      special_district_tax_rate?: number;
      special_district_tax_collectable?: number;
      line_items?: Array<{
        id: string;
        taxable_amount: number;
        tax_collectable: number;
        combined_tax_rate: number;
      }>;
    };
  };
}

export interface TaxJarRateResponse {
  rate: {
    zip: string;
    state: string;
    state_rate: string;
    county: string;
    county_rate: string;
    city: string;
    city_rate: string;
    combined_district_rate: string;
    combined_rate: string;
    freight_taxable: boolean;
  };
}

class TaxJarClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const env = getEnv();
    this.apiKey = env.TAXJAR_API_KEY || '';
    // Use sandbox in development, production API in production
    this.baseUrl = env.NODE_ENV === 'production' ? TAXJAR_API_URL : TAXJAR_SANDBOX_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('TaxJar API key not configured');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `TaxJar API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return response.json();
  }

  /**
   * Calculate sales tax for an order
   */
  async calculateTax(params: TaxJarTaxRequest): Promise<TaxJarTaxResponse> {
    return this.request<TaxJarTaxResponse>('/taxes', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get tax rate for a location
   */
  async getRateForLocation(
    zip: string,
    params?: { city?: string; state?: string; country?: string; street?: string }
  ): Promise<TaxJarRateResponse> {
    const queryParams = new URLSearchParams();
    if (params?.city) queryParams.append('city', params.city);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.country) queryParams.append('country', params.country);
    if (params?.street) queryParams.append('street', params.street);

    const queryString = queryParams.toString();
    const url = `/rates/${encodeURIComponent(zip)}${queryString ? `?${queryString}` : ''}`;

    return this.request<TaxJarRateResponse>(url);
  }

  /**
   * Check if TaxJar is configured and available
   */
  isAvailable(): boolean {
    return features.taxjar;
  }
}

// Singleton instance
let taxjarClient: TaxJarClient | null = null;

export function getTaxJarClient(): TaxJarClient {
  if (!taxjarClient) {
    taxjarClient = new TaxJarClient();
  }
  return taxjarClient;
}

export { TaxJarClient };
