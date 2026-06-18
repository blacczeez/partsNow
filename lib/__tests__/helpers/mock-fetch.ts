/**
 * Stubs `globalThis.fetch` for test isolation.
 */

import { vi, type MockInstance } from 'vitest';

export function createFetchResponse(
  body: unknown,
  ok = true,
  status = 200
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response;
}

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type MockedFetch = MockInstance<FetchFn>;

export type FetchCallInit = RequestInit & {
  headers: Record<string, string>;
};

/** Typed access to a mocked `fetch` invocation (url + init with plain-object headers). */
export function getFetchMockCall(mockFetch: MockedFetch, index = 0): {
  url: string;
  init: FetchCallInit;
} {
  const call = mockFetch.mock.calls[index];
  if (!call) {
    throw new Error(`Expected fetch to have been called (index ${index})`);
  }

  const [url, init = {}] = call;
  const rawHeaders = init.headers;
  let headers: Record<string, string> = {};

  if (rawHeaders instanceof Headers) {
    rawHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(rawHeaders)) {
    headers = Object.fromEntries(rawHeaders);
  } else if (rawHeaders) {
    headers = rawHeaders;
  }

  return { url: String(url), init: { ...init, headers } };
}

export function mockGlobalFetch() {
  const mockFetch = vi.fn<FetchFn>();
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}
