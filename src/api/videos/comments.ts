import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils';
import { getComments } from '../../lib/yt';

export type CommentsQuery = {
	videoId?: string;
	videoUrl?: string;
	url?: string;
	id?: string;
	continuationToken?: string;
	token?: string;
	pageToken?: string;
};

export async function handleComments(query: CommentsQuery) {
	const input = query.videoUrl ?? query.url ?? query.videoId ?? query.id ?? '';
	const continuationToken = query.continuationToken ?? query.token ?? query.pageToken;

	if (!input.trim()) {
		return failure('Video ID or URL is required');
	}

	return getComments(input, continuationToken);
}

export default async function handler(req: { method?: string; query: CommentsQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleComments(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}