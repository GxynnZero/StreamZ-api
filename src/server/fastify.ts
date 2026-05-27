import dotenv from 'dotenv';
import Fastify from 'fastify';

import { handleAi } from '../api/ai/analyze.js';
import { handleHealth } from '../api/health.js';
import { handleChannel } from '../api/channels.js';
import { handleComments } from '../api/videos/comments.js';
import { handlePlaylists } from '../api/playlists.js';
import { handleRelatedVideos } from '../api/videos/related.js';
import { handleSearch } from '../api/videos/search.js';
import { handleTrending } from '../api/videos/trending.js';
import { handleVideoDetails } from '../api/videos/details.js';
import { writeApiResult, writeError } from '../lib/utils.js';

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

dotenv.config();

const app = Fastify({ logger: true });

app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return reply.code(204).send();
  }
});

app.get('/health', async (_request, reply) => {
  const result = await handleHealth();
  return writeApiResult(reply, result);
});

app.get('/api/videos/search', async (request, reply) =>
  writeApiResult(reply, await handleSearch(request.query as Parameters<typeof handleSearch>[0]))
);
app.get('/api/videos/details', async (request, reply) =>
  writeApiResult(reply, await handleVideoDetails(request.query as Parameters<typeof handleVideoDetails>[0]))
);
app.get('/api/videos/related', async (request, reply) =>
  writeApiResult(reply, await handleRelatedVideos(request.query as Parameters<typeof handleRelatedVideos>[0]))
);
app.get('/api/channels', async (request, reply) =>
  writeApiResult(reply, await handleChannel(request.query as Parameters<typeof handleChannel>[0]))
);
app.get('/api/playlists', async (request, reply) =>
  writeApiResult(reply, await handlePlaylists(request.query as Parameters<typeof handlePlaylists>[0]))
);
app.get('/api/videos/comments', async (request, reply) =>
  writeApiResult(reply, await handleComments(request.query as Parameters<typeof handleComments>[0]))
);
app.get('/api/videos/trending', async (request, reply) =>
  writeApiResult(reply, await handleTrending(request.query as Parameters<typeof handleTrending>[0]))
);
app.post('/api/ai/analyze', async (request, reply) =>
  writeApiResult(reply, await handleAi(request.body as Parameters<typeof handleAi>[0]))
);

app.setErrorHandler((error, _request, reply) => {
  return writeError(reply, error, 500);
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});