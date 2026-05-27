import { success, writeApiResult, type ResponseLike } from '../lib/utils';

export async function handleHealth() {
  return success({
    status: 'ok',
    service: 'StreamZ API',
    timestamp: new Date().toISOString()
  });
}

export default async function handler(_: { method?: string }, res: ResponseLike) {
  return writeApiResult(res, await handleHealth());
}