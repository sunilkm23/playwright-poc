/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { ExecutionResult, QTestStatus } from '../models/executionResult.js';

const FALLBACK_STATUS_ID: Record<QTestStatus, number> = {
  PASSED: 601,
  FAILED: 602,
  BLOCKED: 604,
};

export class TestLogService {
  private statusIdByName: Record<string, number> | null = null;

  constructor(private readonly client: QTestClient) {}

  /** Create a Test Log carrying the final status for the given Test Run. */
  async uploadStatus(testRunId: number, result: ExecutionResult): Promise<boolean> {
    const statusId = await this.resolveStatusId(result.status);
    const statusName = capitalise(result.status);

    const body: any = {
      exe_start_date: result.startTime,
      exe_end_date: result.endTime,
      note: result.note ?? 'Executed from Playwright Reporter',
      status: { links: [], id: statusId, name: statusName },
    };

    const resp = await this.client.post(`/test-runs/${testRunId}/test-logs`, body);
    if (!resp.ok) {
      console.log(
        `⚠️  [qTest] log upload failed for run ${testRunId} (${result.status}): HTTP ${resp.statusCode} ${resp.raw.slice(0, 200)}`,
      );
    }
    return resp.ok;
  }

  private async resolveStatusId(status: QTestStatus): Promise<number> {
    if (!this.statusIdByName) {
      this.statusIdByName = await this.loadStatusIds();
    }
    return this.statusIdByName[status.toUpperCase()] ?? FALLBACK_STATUS_ID[status];
  }

  private async loadStatusIds(): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    try {
      const resp = await this.client.get<any[]>('/settings/test-runs/status');
      const list = Array.isArray(resp.body) ? resp.body : [];
      for (const s of list) {
        const key = String(s.label ?? s.name ?? s.value ?? '').toUpperCase();
        if (key && typeof s.id === 'number') map[key] = s.id;
      }
    } catch {
      /* fall back to known production ids */
    }
    return map;
  }
}

function capitalise(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
