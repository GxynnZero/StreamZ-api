import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils.js';
import { getVideoDetails } from '../../lib/yt.js';

export type VideoDetailsQuery = {
	videoId?: string;
	videoUrl?: string;
	url?: string;
	id?: string;
};

export async function handleVideoDetails(query: VideoDetailsQuery) {
	const input = query.videoUrl ?? query.url ?? query.videoId ?? query.id ?? '';

	if (!input.trim()) {
		return failure('Video ID or URL is required');
	}

	return getVideoDetails(input);
}

export default async function handler(req: { method?: string; query: VideoDetailsQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleVideoDetails(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}