/**
 * Modules the host provides to project components. A component may import exactly these
 * specifiers; the worker leaves them out of the bundle and the server hands in its own
 * instances, so components share React and the docs UI with the page around them.
 */
export const PROJECT_COMPONENT_MODULES = [
  'react',
  'react/jsx-runtime',
  'lucide-react',
  'fumadocs-ui/components/accordion',
  'fumadocs-ui/components/banner',
  'fumadocs-ui/components/callout',
  'fumadocs-ui/components/card',
  'fumadocs-ui/components/codeblock',
  'fumadocs-ui/components/files',
  'fumadocs-ui/components/heading',
  'fumadocs-ui/components/image-zoom',
  'fumadocs-ui/components/inline-toc',
  'fumadocs-ui/components/steps',
  'fumadocs-ui/components/tabs',
  'fumadocs-ui/components/type-table',
  '@scriptorium/ui',
] as const

export type ProjectComponentModule = (typeof PROJECT_COMPONENT_MODULES)[number]

/** One `docs/components/<Name>.tsx` of a version, as loaded from its prepared bundle. */
export interface ProjectComponent {
  name: string
  /** The file it comes from, relative to `docs/components`. */
  file: string
  component: unknown
  /** Set by `export const override = true`: the component deliberately replaces a built-in one. */
  override: boolean
}

interface BundledComponentEntry {
  name: string
  file: string
  module: Record<string, unknown>
}

/**
 * Runs a prepared components bundle and returns its components. `requireModule` receives
 * the host modules the components import, one of {@link PROJECT_COMPONENT_MODULES}.
 */
export function evaluateProjectComponents(
  code: string,
  requireModule: (specifier: string) => unknown,
): ProjectComponent[] {
  const module = { exports: {} as { components?: BundledComponentEntry[] } }
  new Function('require', 'module', 'exports', code)(requireModule, module, module.exports)

  return (module.exports.components ?? []).map((entry) => {
    const component = entry.module[entry.name] ?? entry.module.default
    if (typeof component !== 'function' && (typeof component !== 'object' || component === null)) {
      throw new Error(
        `docs/components/${entry.file} must export a component named ${entry.name} or a default export.`,
      )
    }

    return {
      name: entry.name,
      file: entry.file,
      component,
      override: entry.module.override === true,
    }
  })
}
