export class HealthController {
  handle() {
    return new Response(null, {
      status: 204
    });
  }
}
