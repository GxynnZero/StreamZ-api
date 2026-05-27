# StreamZ API

StreamZ API is a backend-only YouTube service built for local development with Bun + Fastify and deployed with Vercel serverless functions.

## Folder Structure

```text
src/
	api/
		ai/
			analyze.ts
		channels.ts
		health.ts
		playlists.ts
		videos/
			comments.ts
			details.ts
			related.ts
			search.ts
			trending.ts
	lib/
		utils.ts
		yt.ts
	server/
		fastify.ts
```

## Endpoints

- `GET /api/videos/search`
- `GET /api/videos/details`
- `GET /api/videos/related`
- `GET /api/channels`
- `GET /api/playlists`
- `GET /api/videos/comments`
- `GET /api/videos/trending`
- `POST /api/ai/analyze`
- `GET /health`

## Shared Response Shape

All route handlers return the same envelope:

```json
{
	"success": true,
	"data": {}
}
```

On failure:

```json
{
	"success": false,
	"error": "message"
}
```

## Local Development

1. Install dependencies: `bun install`
2. Create a `.env` file if you want to override the default host or port.
3. Start the Fastify server: `bun run dev`

## Environment Example

```bash
PORT=3000
HOST=0.0.0.0
```

`PORT` and `HOST` are optional. The backend uses native fetch plus `ytdlp-nodejs` for YouTube extraction, and the yt-dlp binary is resolved from `src/assets` or downloaded on demand from `src/lib/yt.ts`.

## Deployment

`vercel.json` maps the standard endpoints directly to the TypeScript handlers in `src/api/**/*.ts`, and `/health` is exposed as a serverless function too.

## yt-dlp Bootstrap

The shared YouTube wrapper initializes yt-dlp lazily using:

```ts
import { helpers } from 'ytdlp-nodejs';
await helpers.downloadYtDlp();
```

This happens inside `src/lib/yt.ts` before the first extraction call, so the server can start even when the binaries are not present yet.
