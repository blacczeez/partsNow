/** Prefix for runner assignment failures caused by marking an item unavailable. */
export const RUNNER_UNAVAILABLE_REJECTION_PREFIX = 'runner_marked_unavailable';

export function isRunnerUnavailableRejection(reason: string | null | undefined): boolean {
  return Boolean(reason?.startsWith(RUNNER_UNAVAILABLE_REJECTION_PREFIX));
}

/** Parses `runner_marked_unavailable:{itemId}:{reason}` assignment rejection strings. */
export function parseRunnerUnavailableRejection(reason: string | null | undefined): {
  itemId: string;
  reason: string;
} | null {
  if (!isRunnerUnavailableRejection(reason) || !reason) return null;
  const rest = reason.slice(RUNNER_UNAVAILABLE_REJECTION_PREFIX.length + 1);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  return {
    itemId: rest.slice(0, colon),
    reason: rest.slice(colon + 1),
  };
}
