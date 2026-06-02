import { NextRequest } from 'next/server';

/**
 * Create a NextRequest for testing API route handlers.
 */
export function createTestRequest(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
    headers?: Record<string, string>;
  }
): NextRequest {
  const url = new URL(path, 'http://localhost:3000');

  if (options?.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const init: RequestInit = {
    method: options?.method || 'GET',
    headers: options?.headers || {},
  };

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }

  return new NextRequest(url, init);
}

/**
 * Read status and JSON body from a NextResponse.
 */
export async function readResponse(response: Response) {
  const status = response.status;
  const body = await response.json();
  return { status, body };
}

/**
 * Set auth.getUser to return a valid user session.
 */
export function mockAuthUser(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn> } },
  userId = 'user-123'
) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: userId, email: 'test@example.com' } },
    error: null,
  });
}

/**
 * Set auth.getUser to return null (unauthenticated).
 */
export function mockNoAuth(
  mockSupabase: { auth: { getUser: ReturnType<typeof vi.fn> } }
) {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'No session' },
  });
}

/**
 * Create route context with params for dynamic routes.
 */
export function createRouteContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) };
}
