import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils.js';
import { searchVideos } from '../../lib/yt.js';

export type SearchQuery = {
	query?: string;
	q?: string;
	limit?: string;
};

export async function handleSearch(query: SearchQuery) {
	const term = query.query ?? query.q ?? '';
	const limit = Number(query.limit ?? 20);

	if (!term.trim()) {
		return failure('Search query is required');
	}

	return searchVideos(term, Number.isFinite(limit) && limit > 0 ? limit : 20);
}

export default async function handler(req: { method?: string; query: SearchQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleSearch(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}