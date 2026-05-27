import { fetchJson, handleOptions, sendJson } from './_utils.js';

/**
 * Fetch YouTube AI search suggestions
 * @param {string} query - Search term
 * @returns {Promise<string[]>} - List of AI-powered search suggestions
 */
async function fetchVideoSearchSuggestions(query) {
  const url = new URL('https://suggestqueries.google.com/complete/search');
  url.searchParams.set('client', 'youtube');
  url.searchParams.set('ds', 'yt');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', 'en');

  const data = await fetchJson(url, { headers: { accept: 'text/plain' } });
  const match = String(data).match(/window\.google\.ac\.h\((.+)\)/);
  if (!match || match.length < 2) {
    throw new Error('Invalid API response format');
  }

  const parsedData = JSON.parse(match[1]);
  return parsedData[1]?.map((suggestion) => suggestion[0]) || [];
}

export default async function handler(req, res) {
    if (handleOptions(req, res)) {
        return;
    }

    const { query } = req.query;

    if (!query) {
        return sendJson(res, 400, { error: "Search query is required" });
    }

    try {
        const suggestions = await fetchVideoSearchSuggestions(query);

        if (!Array.isArray(suggestions)) {
            return sendJson(res, 500, { error: "Unexpected API response format" });
        }

        return sendJson(res, 200, { suggestions });
    } catch (error) {
        return sendJson(res, 500, { error: error.message });
    }
}
