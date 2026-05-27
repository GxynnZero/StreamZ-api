const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'youtube-v3-alternative.p.rapidapi.com';

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function handleOptions(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  return res.status(statusCode).json(payload);
}

export function getRapidHeaders() {
  if (!RAPID_API_KEY) {
    throw new Error('RAPID_API_KEY is missing. Set it in your environment variables.');
  }

  return {
    'x-rapidapi-key': RAPID_API_KEY,
    'x-rapidapi-host': RAPID_API_HOST
  };
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  let body;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body
        ? body.message || body.error || JSON.stringify(body)
        : String(body || 'Request failed');
    throw new Error(message);
  }

  return body;
}