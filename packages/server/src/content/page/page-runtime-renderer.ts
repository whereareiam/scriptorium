import { executorVirtual } from "@fumadocs/local-md/js/executor-virtual";
import type { ServedPageArtifact } from "@scriptorium/server-api";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import * as JsxRuntime from "react/jsx-runtime";

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor as new (...args: string[]) => (...values: unknown[]) => Promise<any>;

export interface RenderedPreparedPage {
  body: ReactNode;
  toc: unknown[];
}

export async function renderPreparedPageArtifact(
  artifact: ServedPageArtifact,
  components?: MDXComponents,
  context?: Record<string, unknown>
): Promise<RenderedPreparedPage> {
  if (artifact.renderer.kind === "js") {
    const fullScope = {
      ...context,
      opts: {
        ...JsxRuntime,
        baseUrl: artifact.renderer.baseUrl
      }
    };
    const hydrateFn = new AsyncFunction(...Object.keys(fullScope), artifact.renderer.code);
    const out = await hydrateFn.apply(hydrateFn, Object.values(fullScope));

    return {
      toc: out.toc ?? [],
      body: JsxRuntime.jsx(out.default, { components })
    };
  }

  const executor = executorVirtual({
    jsx: JsxRuntime,
    filePath: artifact.renderer.filePath
  });
  const evaluator = {
    evaluateProgram(program: unknown) {
      return executor.program(program as never, {
        ...components,
        ...context
      });
    },
    evaluateExpression(node: unknown) {
      return executor.expression(node as never, {
        ...components,
        ...context
      });
    }
  };
  const renderNode = (tree: unknown) => toJsxRuntime(tree as never, {
    filePath: artifact.renderer.filePath,
    components: components as never,
    development: false,
    createEvaluater() {
      return evaluator;
    },
    ...JsxRuntime
  });

  return {
    toc: (artifact.renderer.rehypeToc ?? []).map((item) => ({
      ...item,
      title: renderNode({
        type: "root",
        children: item.title.children ?? []
      })
    })),
    body: renderNode(artifact.renderer.tree)
  };
}
