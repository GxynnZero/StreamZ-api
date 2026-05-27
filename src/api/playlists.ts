import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../lib/utils';
import { getPlaylists } from '../lib/yt';

export type PlaylistsQuery = {
  playlistId?: string;
  playlistUrl?: string;
  url?: string;
};

export async function handlePlaylists(query: PlaylistsQuery) {
  const input = query.playlistUrl ?? query.url ?? query.playlistId ?? (query as { id?: string }).id ?? '';

  if (!input.trim()) {
    return failure('Playlist ID or URL is required');
  }

  return getPlaylists(input);
}

export default async function handler(req: { method?: string; query: PlaylistsQuery }, res: ResponseLike) {
  if (handleOptions(req, res)) {
    return;
  }

  try {
    return writeApiResult(res, await handlePlaylists(req.query));
  } catch (error) {
    return writeError(res, error);
  }
}