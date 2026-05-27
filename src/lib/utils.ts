export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ResponseLike = {
  code?: (statusCode: number) => ResponseLike;
  status?: (statusCode: number) => ResponseLike;
  header?: (name: string, value: string) => ResponseLike;
  setHeader?: (name: string, value: string) => unknown;
  json?: (body: unknown) => unknown;
  send?: (body?: unknown) => unknown;
  end?: () => unknown;
};

export function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function failure(error: string): ApiFailure {
  return { success: false, error };
}

export function isSuccess<T>(result: ApiResult<T>): result is ApiSuccess<T> {
  return result.success;
}

export function setCorsHeaders(target: ResponseLike): void {
  target.header?.('Access-Control-Allow-Origin', '*');
  target.header?.('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  target.header?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  target.setHeader?.('Access-Control-Allow-Origin', '*');
  target.setHeader?.('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  target.setHeader?.('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(req: { method?: string }, res: ResponseLike): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.code?.(204);
    res.status?.(204);
    res.end?.();
    return true;
  }

  return false;
}

export function writeJson(target: ResponseLike, statusCode: number, body: unknown): unknown {
  setCorsHeaders(target);
  target.code?.(statusCode);
  target.status?.(statusCode);

  if (typeof target.json === 'function') {
    return target.json(body);
  }

  if (typeof target.send === 'function') {
    return target.send(body);
  }

  return target.end?.();
}

export function writeApiResult<T>(target: ResponseLike, result: ApiResult<T>, failureStatusCode = 400): unknown {
  return writeJson(target, result.success ? 200 : failureStatusCode, result);
}

export function writeError(target: ResponseLike, error: unknown, statusCode = 500): unknown {
  const message = error instanceof Error ? error.message : String(error);
  return writeJson(target, statusCode, failure(message));
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function pickFirstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const found = value.find((item) => typeof item === 'string' && item.trim());
      if (typeof found === 'string') {
        return found.trim();
      }
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const found = pickFirstText(record.text, record.simpleText, record.title, record.name, record.label, record.value);
      if (found) {
        return found;
      }
    }
  }

  return '';
}

export function pickFirstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export function compactNumber(value: unknown): string {
  const number = pickFirstNumber(value);
  if (number === undefined) {
    return 'n/a';
  }

  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return String(Math.round(number));
}

export function truncateText(value: unknown, maxLength = 180): string {
  const text = pickFirstText(value);
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}
