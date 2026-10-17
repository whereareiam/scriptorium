import { readFile } from 'node:fs/promises'
import { evaluateProjectComponents, toRefSlug } from '@scriptorium/server-api'
import type { ActiveContentService } from '../active-content-service'

export type ProjectComponentMap = Record<string, unknown>

/**
 * The project components of each version, loaded from its prepared bundle on first use and
 * kept until another generation becomes active.
 */
export class ProjectComponentService {
  private readonly components = new Map<string, Promise<ProjectComponentMap>>()

  constructor(
    private readonly activeContentService: ActiveContentService,
    private readonly hostModules: Record<string, unknown>,
  ) {}

  async getComponents(refNameOrSlug: string): Promise<ProjectComponentMap> {
    const active = await this.activeContentService.getActiveBundle()
    const bundle = await active.bundle
    const refName = await this.activeContentService.resolveRefName(refNameOrSlug)
    const version = bundle.versions.find(
      (entry) => entry.name === refName || toRefSlug(entry.name) === refName,
    )
    if (!version?.componentsPath) {
      return {}
    }

    const cacheKey = `${active.generationId}:${version.name}`
    const cached = this.components.get(cacheKey)
    if (cached) {
      return cached
    }

    for (const key of this.components.keys()) {
      if (!key.startsWith(`${active.generationId}:`)) {
        this.components.delete(key)
      }
    }

    const loaded = this.load(version.componentsPath)
    this.components.set(cacheKey, loaded)
    loaded.catch(() => this.components.delete(cacheKey))
    return loaded
  }

  private async load(componentsPath: string) {
    const code = await readFile(componentsPath, 'utf8')
    const components = evaluateProjectComponents(code, (specifier) => {
      if (!(specifier in this.hostModules)) {
        throw new Error(
          `Project components import "${specifier}", which the host does not provide.`,
        )
      }

      return this.hostModules[specifier]
    })

    return Object.fromEntries(components.map((entry) => [entry.name, entry.component]))
  }
}
