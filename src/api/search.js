import { fetchJson, getRapidHeaders, handleOptions, sendJson } from './_utils.js';

/**
 * Fetch YouTube data from the alternative API.
 * @param {string} url - API endpoint URL.
 * @param {Object} params - Query parameters.
 * @returns {Promise<Object[]>} - API response data.
 */
async function fetchYouTubeData(url, params = {}) {
    const endpoint = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            endpoint.searchParams.set(key, value);
        }
    });

    const data = await fetchJson(endpoint, { headers: getRapidHeaders() });
    return data.data || [];
}

export default async function handler(req, res) {
    if (handleOptions(req, res)) {
        return;
    }
    
    const { type, query, videoId } = req.query;

    let url = `https://youtube-v3-alternative.p.rapidapi.com/search`;
    let params = { geo: "IN", lang: "en", maxResults: 50 };

    switch (type) {
        case "videos":
            if (!query) return res.status(400).json({ error: "Query is required" });
            params.query = query;
            break;

        case "music":
            params.query = "music";
            break;

        case "trending":
            url = `https://youtube-v3-alternative.p.rapidapi.com/trending`;
            break;

        case "recommended":
            params.query = "popular";
            break;

        case "live":
            params.query = "live";
            break;

        case "shorts":
            params.query = "%23shorts";
            break;

        case "suggestions":
            if (!query) return res.status(400).json({ error: "Query is required" });
            params.query = query;
            break;

        case "videoDetails":
            if (!videoId) return res.status(400).json({ error: "Video ID is required" });
            url = `https://youtube-v3-alternative.p.rapidapi.com/video`;
            params.id = videoId;
            break;

        default:
            return res.status(400).json({ error: "Invalid request type" });
    }

    try {
        const items = await fetchYouTubeData(url, params);
        return sendJson(res, 200, items);
    } catch (error) {
        return sendJson(res, 500, { error: error.message });
    }
}
