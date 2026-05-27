import { handleOptions, writeApiResult, writeError, type ResponseLike } from '../../lib/utils.js';
import { aiAnalyzeVideo } from '../../lib/yt.js';

export type AiAnalyzeBody = {
	id?: string;
	videoId?: string;
	videoUrl?: string;
	metadata?: Record<string, unknown>;
	mode?: 'summary' | 'analysis' | 'both';
};

export async function handleAi(body: AiAnalyzeBody) {
	return aiAnalyzeVideo({
		videoId: body.videoId ?? body.id,
		videoUrl: body.videoUrl,
		metadata: body.metadata,
		mode: body.mode
	});
}

export default async function handler(req: { method?: string; body?: AiAnalyzeBody }, res: ResponseLike) {
	if (handleOptions(req, res)) {
		return;
	}

	try {
		return writeApiResult(res, await handleAi(req.body ?? {}));
	} catch (error) {
		return writeError(res, error);
	}
}