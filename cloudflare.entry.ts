import { handle } from "./server/api";

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const path = new URL(request.url).pathname;

    if (path === "/api" || path.startsWith("/api/")) {
      return handle(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
