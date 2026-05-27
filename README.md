# StreamZ API

Backend-only YouTube API service using Fastify for local development and serverless handlers under `src/api` for Vercel.

## Endpoints

- `/api/search`
- `/api/videoDetails`
- `/api/relatedVideos`
- `/api/channel`
- `/api/playlists`
- `/api/comments`
- `/api/trending`
- `/api/ai`

## Local Development

1. Install dependencies: `bun install`
2. Add `RAPID_API_KEY` to your `.env`
3. Run the API server: `bun run dev`

Health check: `GET /health`

## Deployment

`vercel.json` maps `/api/*` routes directly to handlers in `src/api/*`.
