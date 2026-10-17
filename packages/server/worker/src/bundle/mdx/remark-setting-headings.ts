interface Point {
  line: number
  column: number
  offset?: number
}

interface Position {
  start: Point
  end: Point
}

interface MdxNode {
  type: string
  position?: Position
  name?: string | null
  depth?: number
  value?: string
  attributes?: MdxAttribute[]
  children?: MdxNode[]
  data?: Record<string, unknown>
}

interface MdxAttribute {
  type: string
  position?: Position
  name?: string
  value?: string | null | { type: string; value: string }
}

/**
 * Gives each `<Setting name="...">` a heading with its name as its first child, before
 * heading ids are assigned, so the setting gets an anchor, a table-of-contents entry and a
 * search entry like any other heading. `depth` (default 3) sets the heading level and `id`
 * the anchor. The component is told through `headed` that the heading is there.
 *
 * The heading takes the position of the name in the source, which search indexing reads.
 */
export function remarkSettingHeadings() {
  return (tree: MdxNode, file: { value: unknown }) => {
    visit(tree, String(file.value))
  }
}

function visit(node: MdxNode, source: string) {
  for (const child of node.children ?? []) {
    visit(child, source)
  }

  if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Setting') {
    return
  }

  const name = readAttribute(node, 'name')
  if (!name) {
    return
  }

  const id = readAttribute(node, 'id')
  const depth = Number(readAttribute(node, 'depth') ?? 3)
  const position = locateValue(node, 'name', name, source)
  node.children = [
    {
      type: 'heading',
      depth: Number.isInteger(depth) ? Math.min(Math.max(depth, 2), 6) : 3,
      children: [{ type: 'inlineCode', value: name, ...(position ? { position } : {}) }],
      ...(position ? { position } : {}),
      ...(id ? { data: { hProperties: { id } } } : {}),
    },
    ...(node.children ?? []),
  ]
  node.attributes = [
    ...(node.attributes ?? []),
    { type: 'mdxJsxAttribute', name: 'headed', value: null },
  ]
}

/** Where a quoted attribute's value is in the source, when it can be told exactly. */
function locateValue(
  node: MdxNode,
  name: string,
  value: string,
  source: string,
): Position | undefined {
  const end = node.attributes?.find(
    (entry) => entry.type === 'mdxJsxAttribute' && entry.name === name,
  )?.position?.end
  if (end?.offset === undefined) {
    return undefined
  }

  const valueEnd = end.offset - 1
  const valueStart = valueEnd - value.length
  if (source.slice(valueStart, valueEnd) !== value) {
    return undefined
  }

  return {
    start: { line: end.line, column: end.column - 1 - value.length, offset: valueStart },
    end: { line: end.line, column: end.column - 1, offset: valueEnd },
  }
}

/** A literal attribute value, or the source of a simple expression such as `{4}`. */
function readAttribute(node: MdxNode, name: string) {
  const attribute = node.attributes?.find(
    (entry) => entry.type === 'mdxJsxAttribute' && entry.name === name,
  )
  if (typeof attribute?.value === 'string') {
    return attribute.value
  }

  if (attribute?.value?.type === 'mdxJsxAttributeValueExpression') {
    const source = attribute.value.value.trim()
    const literal = /^(['"`])(.*)\1$/.exec(source)
    return literal ? literal[2] : /^\d+$/.test(source) ? source : undefined
  }

  return undefined
}
