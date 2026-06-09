import { hasUsableContent } from "@scriptorium/server-api";
import type { RuntimeStatusService } from "../status-service";
import type { SearchIndexService } from "../search/search-index-service";

export class SearchController {
  constructor(
    private readonly runtimeStatusService: RuntimeStatusService,
    private readonly searchIndexService: SearchIndexService
  ) {}

  async handle(request: Request) {
    const readiness = await this.runtimeStatusService.getReadinessResponse();
    if (!hasUsableContent(readiness)) {
      return Response.json(readiness, {
        status: 503
      });
    }

    const ref = new URL(request.url).searchParams.get("ref") ?? undefined;
    const searchIndex = await this.searchIndexService.getSearchIndex(ref);
    if (searchIndex === undefined) {
      return Response.json({
        state: {
          kind: "failed",
          error: {
            code: "UNKNOWN_REF",
            message: `Unknown ref "${ref ?? ""}".`
          }
        },
        phase: readiness.phase
      }, {
        status: 404
      });
    }

    if (!searchIndex) {
      return Response.json(readiness, {
        status: 503
      });
    }

    return new Response(searchIndex.body, {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
        etag: searchIndex.etag
      }
    });
  }
}
