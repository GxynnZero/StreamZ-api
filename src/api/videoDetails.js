import { fetchJson, getRapidHeaders, handleOptions, sendJson } from './_utils.js';

/**
 * Fetch YouTube data from the alternative API.
 * @param {string} url - API endpoint URL.
 * @param {Object} params - Query parameters.
 * @returns {Promise<Object>} - API response data.
 */
async function fetchYouTubeData(url, params = {}) {
    const endpoint = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            endpoint.searchParams.set(key, value);
        }
    });
    return fetchJson(endpoint, { headers: getRapidHeaders() });
}

/**
 * API Handler for fetching YouTube data.
 */
export default async function handler(req, res) {
    try {
        if (handleOptions(req, res)) {
            return;
        }

        const { type, videoId } = req.query;

        // Validate request parameters
        if (!type) {
            return res.status(400).json({ error: "Request type is required" });
        }

        let url;
        let params = { geo: "IN", lang: "en", maxResults: 50 };

        switch (type) {
            case "videoDetails":
                if (!videoId) {
                    return sendJson(res, 400, { error: "Video ID is required" });
                }
                url = `https://youtube-v3-alternative.p.rapidapi.com/video`;
                params.id = videoId;
                break;

            default:
                return sendJson(res, 400, { error: "Invalid request type" });
        }

        const apiResponse = await fetchYouTubeData(url, params);

        // Validate API response structure
        if (!apiResponse || !apiResponse.id) {
            return sendJson(res, 500, { error: "Invalid API response format" });
        }

        return sendJson(res, 200, { response: apiResponse });
    } catch (error) {
        return sendJson(res, 500, { error: error.message || "Internal Server Error" });
    }
}
