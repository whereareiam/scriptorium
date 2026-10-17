import { builtinModules } from 'node:module'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { build, type Message, type Plugin } from 'esbuild'
import { evaluateProjectComponents, PROJECT_COMPONENT_MODULES } from '@scriptorium/server-api'

const COMPONENT_FILE = /^([A-Z][A-Za-z0-9]*)\.(tsx|jsx)$/
const HOST_MODULES = new Set<string>(PROJECT_COMPONENT_MODULES)
const NODE_BUILTINS = new Set(builtinModules)

/**
 * Bundles the `docs/components` of a version into one CommonJS module. Every
 * `<Name>.tsx` or `<Name>.jsx` at its top level becomes the MDX component `<Name>`; other
 * files are only reachable through imports. The host modules stay external, and any
 * other package, a Node built-in or a file outside `docs/components` fails the bundle.
 *
 * `builtInNames` are the components Scriptorium itself provides: a project component
 * with one of these names must declare `export const override = true`.
 */
export async function bundleProjectComponents(
  componentsDir: string,
  builtInNames: Iterable<string> = [],
) {
  const entries = await listComponentFiles(componentsDir)
  if (entries.length === 0) {
    return null
  }

  const entrySource = [
    ...entries.map(
      (entry, index) => `import * as m${index} from ${JSON.stringify(`./${entry.file}`)}`,
    ),
    `export const components = [${entries
      .map(
        (entry, index) =>
          `{ name: ${JSON.stringify(entry.name)}, file: ${JSON.stringify(entry.file)}, module: m${index} }`,
      )
      .join(', ')}]`,
  ].join('\n')

  let code: string
  try {
    const result = await build({
      stdin: {
        contents: entrySource,
        resolveDir: componentsDir,
        sourcefile: 'docs/components',
        loader: 'js',
      },
      absWorkingDir: componentsDir,
      bundle: true,
      write: false,
      format: 'cjs',
      platform: 'neutral',
      target: 'es2022',
      jsx: 'automatic',
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      logLevel: 'silent',
      plugins: [restrictImports(componentsDir)],
    })
    code = result.outputFiles[0].text
  } catch (error) {
    throw new Error(`Project components failed to build:\n${describeBuildFailure(error)}`)
  }

  checkBundle(code, builtInNames)
  return code
}

async function listComponentFiles(componentsDir: string) {
  const files = await readdir(componentsDir, { withFileTypes: true })
  return files
    .filter((entry) => entry.isFile())
    .flatMap((entry) => {
      const match = COMPONENT_FILE.exec(entry.name)
      return match ? [{ name: match[1], file: entry.name }] : []
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function restrictImports(componentsDir: string): Plugin {
  return {
    name: 'scriptorium:project-component-imports',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') {
          return undefined
        }

        if (args.path.startsWith('.') || path.isAbsolute(args.path)) {
          const resolved = path.resolve(args.resolveDir, args.path)
          if (!isInside(componentsDir, resolved)) {
            return failure(`"${args.path}" is outside docs/components.`)
          }

          return undefined
        }

        if (HOST_MODULES.has(args.path)) {
          return { path: args.path, external: true }
        }

        if (args.path.startsWith('node:') || NODE_BUILTINS.has(args.path.split('/')[0])) {
          return failure(
            `"${args.path}" is a Node built-in; project components cannot use Node APIs.`,
          )
        }

        return failure(
          `"${args.path}" is not provided by Scriptorium. Components can import ${PROJECT_COMPONENT_MODULES.join(', ')} and files inside docs/components.`,
        )
      })
    },
  }
}

function failure(text: string) {
  return { errors: [{ text }] }
}

/**
 * Loads the bundle the way the server does, with stand-ins for the host modules, so a
 * component that fails at load, exports nothing usable or shadows a built-in without
 * saying so fails the preparation rather than the page.
 */
function checkBundle(code: string, builtInNames: Iterable<string>) {
  let components
  try {
    components = evaluateProjectComponents(code, () => createHostModuleStandIn())
  } catch (error) {
    throw new Error(
      `Project components failed to load: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const reserved = new Set(builtInNames)
  for (const component of components) {
    if (reserved.has(component.name) && !component.override) {
      throw new Error(
        `docs/components/${component.file} is named like the built-in component ${component.name}. Rename it, or add \`export const override = true\` to replace the built-in one on purpose.`,
      )
    }
  }
}

function createHostModuleStandIn(): unknown {
  const standIn: unknown = new Proxy(function () {}, {
    get(_, key) {
      if (key === '__esModule') return true
      if (key === Symbol.toPrimitive) return () => ''
      return standIn
    },
    apply: () => standIn,
    construct: () => standIn as object,
  })
  return standIn
}

function describeBuildFailure(error: unknown) {
  const messages = (error as { errors?: Message[] }).errors
  if (!messages?.length) {
    return error instanceof Error ? error.message : String(error)
  }

  return messages
    .map((message) => {
      const file = message.location?.file
      const location = file
        ? `${file.startsWith('docs/components') ? file : `docs/components/${file}`}:${message.location!.line}: `
        : ''
      return `  ${location}${message.text}`
    })
    .join('\n')
}

function isInside(rootDir: string, filePath: string) {
  const relative = path.relative(rootDir, filePath)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}
