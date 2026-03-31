export async function onRequest(context) {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // Pass through known static assets directly
    if (
        path.startsWith('/md/assets/') ||
        path === '/md/favicon.svg'
    ) {
        return context.env.ASSETS.fetch(context.request);
    }

    // For all other /md/* paths (like /md/davidadame), serve the SPA shell.
    // Note: Cloudflare redirects /md/index.html -> /md/, so we request /md/ directly.
    const indexRequest = new Request(
        new URL('/md/', url.origin),
        { method: 'GET', headers: context.request.headers }
    );
    const response = await context.env.ASSETS.fetch(indexRequest);

    return new Response(response.body, {
        status: 200,
        headers: response.headers,
    });
}
