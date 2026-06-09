import { hasUsableContent } from "@scriptorium/server-api";
import type { RuntimeStatusService } from "../status-service";

export class ReadinessController {
  constructor(private readonly runtimeStatusService: RuntimeStatusService) {}

  async handle() {
    const readiness = await this.runtimeStatusService.getReadinessResponse();
    return Response.json(readiness, {
      status: hasUsableContent(readiness) ? 200 : 503
    });
  }
}
