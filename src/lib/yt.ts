import { YtDlp, helpers } from 'ytdlp-nodejs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { compactNumber, pickFirstNumber, pickFirstText, success, failure, type ApiResult, toArray } from './utils.js';

export type NormalizedVideo = {
  id: string;
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnails: string[];
  channelTitle?: string;
  channelId?: string;
  duration?: string;
  views?: number;
  publishedAt?: string;
  live?: boolean;
  raw: unknown;
};

export type NormalizedComment = {
  id?: string;
  author?: string;
  text: string;
  likes?: number;
  publishedAt?: string;
  raw: unknown;
};

export type VideoDetailsPayload = {
  video: NormalizedVideo;
  formats: unknown[];
  streamUrls: string[];
  relatedVideos: NormalizedVideo[];
  raw: unknown;
};

export type ChannelPayload = {
  metadata: {
    id?: string;
    title: string;
    description?: string;
    thumbnail?: string;
    subscribers?: string;
    raw: unknown;
  };
  videos: NormalizedVideo[];
  raw: unknown;
};

export type PlaylistPayload = {
  metadata: {
    id?: string;
    title: string;
    description?: string;
    thumbnail?: string;
    videoCount?: number;
    raw: unknown;
  };
  items: NormalizedVideo[];
  raw: unknown;
};

export type CommentPage = {
  items: NormalizedComment[];
  nextPageToken?: string;
  raw: unknown;
};

export type AiAnalysis = {
  summary: string;
  title: string;
  channel?: string;
  keyPoints: string[];
  tags: string[];
  source: VideoDetailsPayload;
};

let bootstrapPromise: Promise<void> | undefined;
let ytdlpInstance: YtDlp | undefined;
let ytdlpBinaryPath: string | undefined;
let ffmpegBinaryPath: string | undefined;

function getBundledYtDlpBinaryPath(): string | undefined {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined>; platform?: string };
  }).process;

  if (env?.env?.YTDLP_BINARY_PATH) {
    return env.env.YTDLP_BINARY_PATH;
  }

  const assetName = env?.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  return fileURLToPath(new URL(`../assets/${assetName}`, import.meta.url));
}

function getRuntimeDownloadDir(): string {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;

  return env?.YTDLP_DOWNLOAD_DIR ?? env?.TMPDIR ?? env?.TEMP ?? env?.TMP ?? '/tmp/streamz-ytdlp';
}

function ensureYtDlpReady(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const downloadDir = getRuntimeDownloadDir();
      const bundledBinaryPath = getBundledYtDlpBinaryPath();

      if (bundledBinaryPath && existsSync(bundledBinaryPath)) {
        ytdlpBinaryPath = bundledBinaryPath;
      } else {
        ytdlpBinaryPath = await helpers.downloadYtDlp(downloadDir);
      }

      ffmpegBinaryPath = await helpers.downloadFFmpeg(downloadDir);
    })();
  }

  return bootstrapPromise;
}

async function getYtDlp(): Promise<YtDlp> {
  await ensureYtDlpReady();

  if (!ytdlpInstance) {
    if (!ytdlpBinaryPath) {
      throw new Error('yt-dlp binary not found after bootstrap');
    }

    ytdlpInstance = new YtDlp({
      binaryPath: ytdlpBinaryPath,
      ffmpegPath: ffmpegBinaryPath
    });
  }

  return ytdlpInstance;
}

function resolveYouTubeUrl(input: string, kind: 'video' | 'channel' | 'playlist'): string {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (kind === 'playlist') {
    return `https://www.youtube.com/playlist?list=${input}`;
  }

  if (kind === 'channel') {
    if (input.startsWith('@')) {
      return `https://www.youtube.com/${input}/videos`;
    }

    if (input.startsWith('UC')) {
      return `https://www.youtube.com/channel/${input}/videos`;
    }

    return `https://www.youtube.com/@${input.replace(/^@/, '')}/videos`;
  }

  return `https://www.youtube.com/watch?v=${input}`;
}

function extractId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  const record = value as Record<string, unknown> | undefined;
  if (!record) {
    return '';
  }

  return pickFirstText(record.id, record.videoId, record.playlistId, record.channelId, record.url, record.webpage_url);
}

function extractThumbnail(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const thumbnail = extractThumbnail(item);
      if (thumbnail) {
        return thumbnail;
      }
    }

    return '';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return pickFirstText(record.url, record.thumbnail, record.src);
  }

  return '';
}

function normalizeVideo(raw: unknown): NormalizedVideo {
  const record = (raw ?? {}) as Record<string, unknown>;
  const thumbnails = toArray(record.thumbnails)
    .map((item) => extractThumbnail(item))
    .filter(Boolean);

  const id = extractId(record.id) || extractId(record.videoId) || extractId(record.url);
  const url = pickFirstText(record.webpage_url, record.url) || (id ? `https://www.youtube.com/watch?v=${id}` : '');

  return {
    id,
    url,
    title: pickFirstText(record.title, record.name) || 'Untitled video',
    description: pickFirstText(record.description, record.short_description, record.fulltitle),
    thumbnail: thumbnails[0] || extractThumbnail(record.thumbnail),
    thumbnails,
    channelTitle: pickFirstText(record.channel, record.channelTitle, record.uploader),
    channelId: pickFirstText(record.channel_id, record.uploader_id),
    duration: pickFirstText(record.duration_string, record.duration, record.duration_string),
    views: pickFirstNumber(record.view_count, record.views, record.play_count),
    publishedAt: pickFirstText(record.upload_date, record.published_time, record.release_date),
    live: Boolean(record.is_live || record.live_status === 'is_live'),
    raw
  };
}

function extractEntries(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const record = raw as Record<string, unknown>;
  const candidates = [record.entries, record.items, record.videos, record.related_videos, record.comments, record.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function getMetadata(raw: unknown): {
  id?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  subscribers?: string;
  videoCount?: number;
} {
  if (!raw || typeof raw !== 'object') {
    return { title: 'Untitled' };
  }

  const record = raw as Record<string, unknown>;
  return {
    id: extractId(record.id) || undefined,
    title: pickFirstText(record.title, record.channel, record.uploader, record.playlist_title) || 'Untitled',
    description: pickFirstText(record.description, record.full_description, record.short_description),
    thumbnail: extractThumbnail(record.thumbnail),
    subscribers: pickFirstText(record.channel_follower_count, record.channel_subscriber_count, record.subscriber_count),
    videoCount: pickFirstNumber(record.video_count, record.playlist_count, record.entries_count)
  };
}

function normalizeResultList(raw: unknown): NormalizedVideo[] {
  return extractEntries(raw).map((item) => normalizeVideo(item));
}

async function safeGetInfo(url: string): Promise<Record<string, unknown>> {
  const ytdlp = await getYtDlp();
  const info = (await ytdlp.getInfoAsync(url)) as unknown as Record<string, unknown>;
  return info ?? {};
}

async function safeGetDirectUrls(url: string): Promise<string[]> {
  try {
    const ytdlp = await getYtDlp();
    const result = (await ytdlp.getDirectUrlsAsync(url)) as unknown;

    if (Array.isArray(result)) {
      return result.map((item) => (typeof item === 'string' ? item : pickFirstText(item))).filter(Boolean);
    }

    if (result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      return extractEntries(result)
        .map((item) => (typeof item === 'string' ? item : pickFirstText((item as Record<string, unknown>).url, (item as Record<string, unknown>).directUrl, (item as Record<string, unknown>).href)))
        .filter(Boolean)
        .concat(toArray(record.urls).map((item) => pickFirstText(item)).filter(Boolean));
    }
  } catch {
    return [];
  }

  return [];
}

export async function searchVideos(query: string, limit = 20): Promise<ApiResult<{ items: NormalizedVideo[]; query: string }>> {
  if (!query.trim()) {
    return failure('Search query is required');
  }

  const info = await safeGetInfo(`ytsearch${limit}:${query.trim()}`);
  return success({ items: normalizeResultList(info), query: query.trim() });
}

export async function getVideoDetails(input: string): Promise<ApiResult<VideoDetailsPayload>> {
  if (!input.trim()) {
    return failure('Video ID or URL is required');
  }

  const url = resolveYouTubeUrl(input.trim(), 'video');
  const [info, streamUrls] = await Promise.all([safeGetInfo(url), safeGetDirectUrls(url)]);

  const relatedVideos = normalizeResultList(info.related_videos ?? info.entries ?? info.related);
  const formats = Array.isArray(info.formats) ? info.formats : [];

  return success({
    video: normalizeVideo({ ...info, url }),
    formats,
    streamUrls,
    relatedVideos,
    raw: info
  });
}

export async function getRelatedVideos(input: string): Promise<ApiResult<{ items: NormalizedVideo[]; videoId: string }>> {
  const details = await getVideoDetails(input);
  if (!details.success) {
    return details;
  }

  return success({
    items: details.data.relatedVideos,
    videoId: details.data.video.id
  });
}

export async function getChannel(input: string): Promise<ApiResult<ChannelPayload>> {
  if (!input.trim()) {
    return failure('Channel ID or handle is required');
  }

  const url = resolveYouTubeUrl(input.trim(), 'channel');
  const info = await safeGetInfo(url);
  const videos = normalizeResultList(info.entries ?? info.videos ?? info.related_videos);
  const metadata = getMetadata(info);

  return success({
    metadata: {
      id: metadata.id,
      title: metadata.title || 'Channel',
      description: metadata.description,
      thumbnail: metadata.thumbnail,
      subscribers: metadata.subscribers ? String(metadata.subscribers) : undefined,
      raw: info
    },
    videos,
    raw: info
  });
}

export async function getPlaylists(input: string): Promise<ApiResult<PlaylistPayload>> {
  if (!input.trim()) {
    return failure('Playlist ID or URL is required');
  }

  const url = resolveYouTubeUrl(input.trim(), 'playlist');
  const info = await safeGetInfo(url);
  const items = normalizeResultList(info.entries ?? info.videos ?? info.items);
  const metadata = getMetadata(info);

  return success({
    metadata: {
      id: metadata.id,
      title: metadata.title || 'Playlist',
      description: metadata.description,
      thumbnail: metadata.thumbnail,
      videoCount: metadata.videoCount,
      raw: info
    },
    items,
    raw: info
  });
}

export async function getTrending(category = 'default'): Promise<ApiResult<{ items: NormalizedVideo[]; category: string }>> {
  const url = 'https://www.youtube.com/feed/trending';
  const info = await safeGetInfo(url);
  const items = normalizeResultList(info.entries ?? info.videos ?? info.items);

  return success({ items, category });
}

type CommentContinuationResponse = {
  items: NormalizedComment[];
  nextPageToken?: string;
  raw: unknown;
};

function extractJsonBlob(html: string): Record<string, unknown> | undefined {
  const patterns = [
    /var ytInitialData = (\{.*?\});<\/script>/s,
    /window\["ytInitialData"\] = (\{.*?\});/s,
    /ytInitialData\s*=\s*(\{.*?\});/s
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as Record<string, unknown>;
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

function findDeepToken(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  const directCandidates = [
    record.token,
    record.continuation,
    record.continuationToken,
    record.nextContinuationToken
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nested of Object.values(record)) {
    const token = findDeepToken(nested);
    if (token) {
      return token;
    }
  }

  return undefined;
}

function collectCommentThreads(value: unknown, acc: NormalizedComment[] = []): NormalizedComment[] {
  if (!value || typeof value !== 'object') {
    return acc;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCommentThreads(item, acc);
    }

    return acc;
  }

  const record = value as Record<string, unknown>;
  if (record.commentThreadRenderer) {
    const thread = record.commentThreadRenderer as Record<string, unknown>;
    const comment = thread.comment as Record<string, unknown> | undefined;
    const renderer = comment?.commentRenderer as Record<string, unknown> | undefined;

    if (renderer) {
      const authorText = renderer.authorText as any;
      const contentText = renderer.contentText as any;
      const voteCount = renderer.voteCount as any;
      acc.push({
        id: pickFirstText(renderer.commentId),
        author: pickFirstText(authorText, authorText?.simpleText, authorText?.runs),
        text: pickFirstText(contentText, contentText?.simpleText, contentText?.runs),
        likes: pickFirstNumber(voteCount, voteCount?.simpleText),
        publishedAt: pickFirstText(renderer.publishedTimeText),
        raw: renderer
      });
    }
  }

  if (record.commentRenderer) {
    const renderer = record.commentRenderer as Record<string, unknown>;
    const authorText = renderer.authorText as any;
    const contentText = renderer.contentText as any;
    const voteCount = renderer.voteCount as any;
    acc.push({
      id: pickFirstText(renderer.commentId),
      author: pickFirstText(authorText, authorText?.simpleText, authorText?.runs),
      text: pickFirstText(contentText, contentText?.simpleText, contentText?.runs),
      likes: pickFirstNumber(voteCount, voteCount?.simpleText),
      publishedAt: pickFirstText(renderer.publishedTimeText),
      raw: renderer
    });
  }

  for (const nested of Object.values(record)) {
    collectCommentThreads(nested, acc);
  }

  return acc;
}

async function fetchCommentContinuation(token: string, apiKey: string, visitorData?: string): Promise<CommentContinuationResponse> {
  const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-visitor-id': visitorData ?? '',
      'x-youtube-client-name': '1',
      'x-youtube-client-version': '2.20250513.00.00'
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20250513.00.00',
          hl: 'en',
          gl: 'US',
          visitorData
        }
      },
      continuation: token
    })
  });

  const json = (await response.json()) as Record<string, unknown>;
  const items = collectCommentThreads(json);
  const nextPageToken = findDeepToken(json);

  return { items, nextPageToken, raw: json };
}

export async function getComments(input: string, continuationToken?: string): Promise<ApiResult<CommentContinuationResponse>> {
  if (!input.trim()) {
    return failure('Video ID or URL is required');
  }

  const url = resolveYouTubeUrl(input.trim(), 'video');

  if (continuationToken) {
    const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    if (!apiKey) {
      return failure('Unable to resolve comment continuation');
    }

    const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] ?? html.match(/"visitorData":"([^"]+)"/)?.[1];
    const result = await fetchCommentContinuation(continuationToken, apiKey, visitorData);
    return success(result);
  }

  const htmlResponse = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept-language': 'en-US,en;q=0.9'
    }
  });

  const html = await htmlResponse.text();
  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  if (!apiKey) {
    return failure('Unable to resolve comment API key');
  }

  const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1] ?? html.match(/"visitorData":"([^"]+)"/)?.[1];
  const initialData = extractJsonBlob(html);
  const token = initialData ? findDeepToken(initialData) : undefined;

  if (!token) {
    return failure('Comments are unavailable for this video');
  }

  const result = await fetchCommentContinuation(token, apiKey, visitorData);
  return success(result);
}

export async function aiAnalyzeVideo(input: {
  videoId?: string;
  videoUrl?: string;
  metadata?: Partial<NormalizedVideo>;
  mode?: 'summary' | 'analysis' | 'both';
}): Promise<ApiResult<AiAnalysis>> {
  const requestedUrl = input.videoUrl ?? input.videoId;
  let videoResult: ApiResult<VideoDetailsPayload> | undefined;

  if (requestedUrl) {
    videoResult = await getVideoDetails(requestedUrl);
    if (!videoResult.success) {
      return videoResult;
    }
  }

  const video = videoResult?.success ? videoResult.data.video : undefined;
  const fallback = input.metadata ?? {};
  const normalizedVideo: NormalizedVideo = video ?? {
    id: fallback.id ?? input.videoId ?? '',
    url: fallback.url ?? input.videoUrl ?? '',
    title: fallback.title ?? 'Untitled video',
    description: fallback.description,
    thumbnail: fallback.thumbnail,
    thumbnails: fallback.thumbnails ?? [],
    channelTitle: fallback.channelTitle,
    channelId: fallback.channelId,
    duration: fallback.duration,
    views: fallback.views,
    publishedAt: fallback.publishedAt,
    live: fallback.live,
    raw: fallback.raw ?? {}
  };

  const summaryParts = [
    normalizedVideo.title,
    normalizedVideo.channelTitle ? `by ${normalizedVideo.channelTitle}` : undefined,
    normalizedVideo.views !== undefined ? `${compactNumber(normalizedVideo.views)} views` : undefined,
    normalizedVideo.duration ? `duration ${normalizedVideo.duration}` : undefined
  ].filter(Boolean);

  const description = pickFirstText(normalizedVideo.description) || 'No description available.';
  const rawSource = videoResult?.success ? (videoResult.data.raw as Record<string, unknown>) : ((fallback.raw as Record<string, unknown> | undefined) ?? {});
  const tags = toArray(rawSource.tags).map((tag) => pickFirstText(tag)).filter(Boolean);
  const keyPoints = [
    description ? `Description: ${description.slice(0, 220)}` : 'Description unavailable',
    normalizedVideo.publishedAt ? `Published: ${normalizedVideo.publishedAt}` : 'Published date unavailable',
    normalizedVideo.live ? 'Live content' : 'Recorded content'
  ];

  return success({
    summary: summaryParts.join('. '),
    title: normalizedVideo.title,
    channel: normalizedVideo.channelTitle,
    keyPoints,
    tags,
    source: videoResult?.success
      ? videoResult.data
      : {
          video: normalizedVideo,
          formats: [],
          streamUrls: [],
          relatedVideos: [],
          raw: fallback.raw ?? {}
        }
  });
}
