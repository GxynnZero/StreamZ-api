import dotenv from 'dotenv';
import Fastify from 'fastify';

import aiHandler from './api/ai.js';
import channelHandler from './api/channel.js';
import commentsHandler from './api/comments.js';
import playlistsHandler from './api/playlists.js';
import relatedVideosHandler from './api/relatedVideos.js';
import searchHandler from './api/search.js';
import trendingHandler from './api/trending.js';
import videoDetailsHandler from './api/videoDetails.js';

dotenv.config();

const app = Fastify({ logger: true });

function adapt(handler) {
  return async (request, reply) => {
    const req = {
      method: request.method,
      headers: request.headers,
      query: request.query,
      body: request.body,
      url: request.url
    };

    const res = {
      setHeader(name, value) {
        reply.header(name, value);
      },
      status(code) {
        reply.code(code);
        return this;
      },
      json(payload) {
        reply.send(payload);
        return this;
      },
      end() {
        reply.send();
      }
    };

    await handler(req, res);
  };
}

app.get('/health', async () => ({ ok: true, service: 'streamz-api' }));

app.route({ method: ['GET', 'OPTIONS'], url: '/api/ai', handler: adapt(aiHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/channel', handler: adapt(channelHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/comments', handler: adapt(commentsHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/playlists', handler: adapt(playlistsHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/relatedVideos', handler: adapt(relatedVideosHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/search', handler: adapt(searchHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/trending', handler: adapt(trendingHandler) });
app.route({ method: ['GET', 'OPTIONS'], url: '/api/videoDetails', handler: adapt(videoDetailsHandler) });

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`Server listening on http://${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });