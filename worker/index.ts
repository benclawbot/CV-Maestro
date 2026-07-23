interface AssetFetcher {
  fetch(request: Request | URL | string): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
  MINIMAX_API_KEY?: string;
}

const MINIMAX_ORIGIN = 'https://api.minimax.io';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/minimax/')) {
      if (!env.MINIMAX_API_KEY) {
        return Response.json({ error: { message: 'MiniMax is not configured for this site.' } }, { status: 503 });
      }

      const upstreamUrl = new URL(url.pathname.replace(/^\/minimax/, ''), MINIMAX_ORIGIN);
      upstreamUrl.search = url.search;
      const headers = new Headers(request.headers);
      headers.set('Authorization', `Bearer ${env.MINIMAX_API_KEY}`);

      return fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: request.body,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
