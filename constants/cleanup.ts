/** Rows fetched per batch by the background cleanup sweeps. */
export const CLEANUP_BATCH_SIZE = 500

/** Max batches per cleanup run, caps a single run at CLEANUP_BATCH_SIZE * this. */
export const CLEANUP_MAX_BATCHES = 3
