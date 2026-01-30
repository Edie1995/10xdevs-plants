import type { ApiResponseDto } from "@/types";

export interface ApiErrorViewModel {
  code: string;
  message: string;
  details?: unknown;
  httpStatus?: number;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiErrorViewModel | null;
  httpStatus: number;
  response: ApiResponseDto<T> | null;
}

type QueryParams = Record<string, string | number | boolean | null | undefined>;

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const getBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost";
  }

  return window.location.origin;
};

const buildUrl = (path: string, params?: QueryParams) => {
  const url = new URL(path, getBaseUrl());

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const parseJson = <T>(payload: string): ApiResponseDto<T> | null => {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as ApiResponseDto<T>;
  } catch {
    return null;
  }
};

const buildError = <T>(response: Response, payload: ApiResponseDto<T> | null): ApiErrorViewModel => {
  if (payload?.error) {
    return {
      code: payload.error.code ?? "unknown_error",
      message: payload.error.message ?? "Nieoczekiwany blad.",
      details: payload.error.details,
      httpStatus: response.status,
    };
  }

  if (!response.ok) {
    return {
      code: `http_${response.status}`,
      message: response.statusText || "Nieoczekiwany blad.",
      httpStatus: response.status,
    };
  }

  return {
    code: "unknown_error",
    message: "Nieoczekiwany blad.",
    httpStatus: response.status,
  };
};

const request = async <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options?: { params?: QueryParams; body?: unknown }
): Promise<ApiResult<T>> => {
  const url = buildUrl(path, options?.params);
  const response = await fetch(url, {
    method,
    headers: DEFAULT_HEADERS,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });
  const payloadText = await response.text();
  const payload = parseJson<T>(payloadText);
  const hasError = !response.ok || payload?.success === false || payload?.error;
  const error = hasError ? buildError(response, payload) : null;

  return {
    data: payload?.data ?? null,
    error,
    httpStatus: response.status,
    response: payload,
  };
};

export const apiGet = async <T>(path: string, params?: QueryParams): Promise<ApiResult<T>> =>
  request<T>("GET", path, { params });

export const apiPost = async <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
  request<T>("POST", path, { body });

export const apiPut = async <T>(path: string, body?: unknown): Promise<ApiResult<T>> =>
  request<T>("PUT", path, { body });

export const apiDelete = async <T>(path: string): Promise<ApiResult<T>> => request<T>("DELETE", path);
