export async function onRequest(context) {
    const request = context.request;
    const env = context.env;
    const params = context.params;

    // 1. Handle CORS Preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // Replace with the user's details
    const GITHUB_OWNER = 'nathanpuls';
    const GITHUB_REPO = 'ai-workflow-notes'; // the repo we will create
    const DEFAULT_BRANCH = 'main';

    let pathArg = params.path;
    if (!pathArg || pathArg.length === 0) {
        return new Response('Please provide a file path, e.g., /notes/meeting.md', { status: 400 });
    }

    // params.path is an array in Pages functions for [[path]].js
    const path = Array.isArray(pathArg) ? pathArg.join('/') : pathArg;

    // Construct the GitHub Raw URL
    const githubUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${DEFAULT_BRANCH}/${path}`;

    try {
        // Fetch the private file from GitHub using the secure token
        const response = await fetch(githubUrl, {
            headers: {
                'Authorization': `token ${env.GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3.raw',
                'User-Agent': 'Cloudflare-Worker-Proxy'
            }
        });

        if (!response.ok) {
            return new Response(`Error from GitHub: ${response.status} ${response.statusText}`, {
                status: response.status,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const text = await response.text();

        // Return the raw markdown back to the frontend with CORS headers
        return new Response(text, {
            headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60', // Cache for 60 seconds
            },
        });

    } catch (error) {
        return new Response(`Worker Error: ${error.message}`, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}
