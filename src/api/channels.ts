import { failure, handleOptions, writeApiResult, writeError, type ResponseLike } from '../lib/utils.js';
import { getChannel } from '../lib/yt.js';

export type ChannelQuery = {
	channelId?: string;
	channelUrl?: string;
	url?: string;
	handle?: string;
	id?: string;
};

export async function handleChannel(query: ChannelQuery) {
	const input = query.channelUrl ?? query.url ?? query.channelId ?? query.handle ?? query.id ?? '';

	if (!input.trim()) {
		return failure('Channel ID or handle is required');
	}

	return getChannel(input);
}

export default async function handler(req: { method?: string; query: ChannelQuery }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleChannel(req.query));
	} catch (error) {
		return writeError(res, error);
	}
}