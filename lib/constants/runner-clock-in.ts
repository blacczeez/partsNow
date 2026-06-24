/** True when shift start should not require browser GPS (local dev). */
export const skipRunnerClockInGeoCheck =
  process.env.RUNNER_SKIP_CLOCK_IN_GEO_CHECK === 'true';
