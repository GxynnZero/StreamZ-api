import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils.js';
import { getRelatedVideos } from '../../lib/yt.js';

export type RelatedVideosQuery = {
	videoId?: string;
	videoUrl?: string;
	url?: string;
	id?: string;
};

export async function handleRelatedVideos(query: RelatedVideosQuery) {
	const input = query.videoUrl ?? query.url ?? query.videoId ?? query.id ?? '';

	if (!input.trim()) {
		return failure('Video ID or URL is required');
	}

	return getRelatedVideos(input);
}

export default async function handler(req: { method?: string; query: RelatedVideosQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleRelatedVideos(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}