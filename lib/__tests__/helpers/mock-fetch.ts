/**
 * Stubs `globalThis.fetch` for test isolation.
 */

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

export function mockGlobalFetch() {
  const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}
