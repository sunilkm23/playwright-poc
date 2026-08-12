/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QTestClient } from '../client/qtestClient.js';
import type { QTestModule } from '../models/qtestResult.js';
import type { QTestCache } from '../utils/cache.js';

export class ModuleService {
  private static readonly ORPHANED_DESCRIPTION =
    'This module is designed for automated test cases within test runs that ' +
    'have no associated test cases in the system. Test cases in this module ' +
    'need to be moved to the right module and linked to requirements.';

  constructor(
    private readonly client: QTestClient,
    private readonly cache: QTestCache,
  ) {}

  async ensureCycleModule(
    orphanedName: string,
    rootName: string,
    cycleId: string,
  ): Promise<number> {
    const cacheKey = `${orphanedName}/${rootName}/${cycleId}`;
    const cached = this.cache.get('modules', cacheKey);
    if (cached) {
      console.log(`📁 [qTest] Module cache hit: "${cacheKey}" → id ${cached}`);
      return cached;
    }

    console.log(`📁 [qTest] Resolving module tree: ${orphanedName} / ${rootName} / ${cycleId}`);
    const orphanedId = await this.ensureModule(orphanedName, undefined, {
      description: ModuleService.ORPHANED_DESCRIPTION,
    });
    const rootId = await this.ensureModule(rootName, orphanedId);
    const cycleModuleId = await this.ensureModule(cycleId, rootId);

    this.cache.set('modules', cacheKey, cycleModuleId);
    // Invalidate suite and test-run cache whenever a new module tree is
    // resolved — stale ids under the old module will cause 404s.
    this.cache.clearKind('suites');
    this.cache.clearKind('testRuns');
    console.log(`📁 [qTest] Module tree ready: "${cycleId}" → id ${cycleModuleId}`);
    return cycleModuleId;
  }

  private async ensureModule(
    name: string,
    parentId?: number,
    extra?: { description?: string },
  ): Promise<number> {
    const existing = await this.findModule(name, parentId);
    if (existing) {
      console.log(`📁 [qTest] Module found: "${name}" (id ${existing.id}, parentId=${parentId ?? 'root'})`);
      return existing.id;
    }

    // qTest module creation: POST /modules?parentId=<id> with name in body.
    // The parentId MUST be in the query string — body-only does not work.
    const endpoint = parentId !== undefined ? `/modules?parentId=${parentId}` : '/modules';
    const body: any = { name };
    if (extra?.description) body.description = extra.description;

    console.log(`📁 [qTest] Creating module: "${name}" under parentId=${parentId ?? 'root'}`);
    const resp = await this.client.post<QTestModule>(endpoint, body);

    if (!resp.ok || !resp.body?.id) {
      throw new Error(
        `[qTest] Failed to create module "${name}" (parentId=${parentId ?? 'root'}): ` +
          `HTTP ${resp.statusCode} — ${resp.raw.slice(0, 400)}`,
      );
    }
    console.log(`📁 [qTest] Module created: "${name}" (id ${resp.body.id})`);
    return resp.body.id;
  }

  private async findModule(name: string, parentId?: number): Promise<QTestModule | null> {
    try {
      // qTest lists modules under a specific parent using parentId query param.
      // Without parentId it lists only the root-level modules.
      const endpoint = parentId !== undefined
        ? `/modules?parentId=${parentId}`
        : '/modules';

      const resp = await this.client.get<any>(endpoint);
      if (!resp.ok) {
        console.log(`⚠️  [qTest] GET ${endpoint} failed: HTTP ${resp.statusCode}`);
        return null;
      }

      // Response is either an array or { items: [...] } or { data: [...] }
      const raw = resp.body;
      const nodes: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      const match = nodes.find((m: any) => m.name === name);
      if (!match) return null;
      return { id: match.id, name: match.name, parent_id: match.parent_id ?? parentId };
    } catch (e) {
      console.log(`⚠️  [qTest] findModule error: ${(e as Error).message}`);
      return null;
    }
  }
}
