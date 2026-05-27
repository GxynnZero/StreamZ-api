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
    if (handleOptions(req, res)) {
        return;
    }
    
    const { type, videoId } = req.query;

    if (!videoId) {
        return sendJson(res, 400, { error: "Video ID is required" });
    }

    let url;
    let params = { geo: "IN", lang: "en" };

    if (type === "relatedVideos") {
        url = `https://youtube-v3-alternative.p.rapidapi.com/related`;
        params.id = videoId;
    } else {
        return sendJson(res, 400, { error: "Invalid request type" });
    }

    try {
        const apiResponse = await fetchYouTubeData(url, params);

        if (!apiResponse || Object.keys(apiResponse).length === 0) {
            return sendJson(res, 500, { error: "Unexpected API response format" });
        }

        return sendJson(res, 200, { response: apiResponse });
    } catch (error) {
        return sendJson(res, 500, { error: error.message });
    }
}
