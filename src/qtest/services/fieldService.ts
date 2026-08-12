/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';

export interface AutomationFieldIds {
  /** field_id of the "Automation" (Yes/No) test-case field, if discoverable. */
  automationFieldId?: number;
  /** field_value id that represents "Yes" for the Automation field. */
  automationYesValue?: string;
  /** field_id of the "Automation Content" test-case field, if discoverable. */
  automationContentFieldId?: number;
}

/**
 * Discovers the qTest test-case field ids for "Automation" and
 * "Automation Content" so new Test Cases can be created with the correct
 * custom-field payload (mirrors the production `Get-TestCaseFieldProperties`).
 *
 * qTest assigns these field ids per project, so they must not be hardcoded.
 */
export class FieldService {
  private cached: AutomationFieldIds | null = null;

  constructor(private readonly client: QTestClient) {}

  async getAutomationFieldIds(): Promise<AutomationFieldIds> {
    if (this.cached) return this.cached;

    const result: AutomationFieldIds = {};
    try {
      const resp = await this.client.get<any[]>('/settings/test-cases/fields');
      const fields = Array.isArray(resp.body) ? resp.body : [];
      for (const f of fields) {
        const label = String(f.label ?? f.field_name ?? '').toLowerCase();
        if (label === 'automation') {
          result.automationFieldId = f.id ?? f.field_id;
          const yes = (f.allowed_values ?? []).find(
            (v: any) => String(v.label ?? v.value_name ?? '').toLowerCase() === 'yes',
          );
          if (yes) result.automationYesValue = String(yes.value ?? yes.field_value ?? '711');
        } else if (label === 'automation content') {
          result.automationContentFieldId = f.id ?? f.field_id;
        }
      }
    } catch {
      /* fall back to no custom-field payload */
    }

    this.cached = result;
    return result;
  }
}
