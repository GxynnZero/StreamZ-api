import { handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils.js';
import { getTrending } from '../../lib/yt.js';

export type TrendingQuery = {
	category?: string;
	type?: string;
};

export async function handleTrending(query: TrendingQuery) {
	return getTrending(query.category ?? query.type ?? 'default');
}

export default async function handler(req: { method?: string; query: TrendingQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleTrending(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}