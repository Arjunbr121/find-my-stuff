/**
 * Batch Loading Utilities
 * 
 * Provides utilities for progressive loading of large datasets.
 * Automatically switches between full load and batch load based on dataset size.
 */

/**
 * Threshold for switching to batch loading
 * If item count exceeds this, use batch loading
 */
export const BATCH_LOADING_THRESHOLD = 1000;

/**
 * Default batch size for loading items
 */
export const DEFAULT_BATCH_SIZE = 1000;

/**
 * Determine if batch loading should be used
 * 
 * @param totalCount - Total number of items
 * @returns True if batch loading should be used
 */
export function shouldUseBatchLoading(totalCount: number): boolean {
    return totalCount > BATCH_LOADING_THRESHOLD;
}

/**
 * Calculate number of batches needed
 * 
 * @param totalCount - Total number of items
 * @param batchSize - Size of each batch
 * @returns Number of batches needed
 */
export function calculateBatchCount(totalCount: number, batchSize: number = DEFAULT_BATCH_SIZE): number {
    return Math.ceil(totalCount / batchSize);
}

/**
 * Get batch range for a given batch number
 * 
 * @param batchNumber - Batch number (0-indexed)
 * @param batchSize - Size of each batch
 * @returns Object with offset and limit
 */
export function getBatchRange(batchNumber: number, batchSize: number = DEFAULT_BATCH_SIZE): { offset: number; limit: number } {
    return {
        offset: batchNumber * batchSize,
        limit: batchSize,
    };
}

/**
 * Progress callback type for batch loading
 */
export type BatchLoadingProgressCallback = (loaded: number, total: number) => void;

/**
 * Load data in batches with progress tracking
 * 
 * @param totalCount - Total number of items to load
 * @param loadBatch - Function to load a single batch
 * @param onProgress - Optional progress callback
 * @param batchSize - Size of each batch
 */
export async function loadInBatches<T>(
    totalCount: number,
    loadBatch: (offset: number, limit: number) => Promise<T[]>,
    onProgress?: BatchLoadingProgressCallback,
    batchSize: number = DEFAULT_BATCH_SIZE
): Promise<T[]> {
    const results: T[] = [];
    const batchCount = calculateBatchCount(totalCount, batchSize);

    for (let i = 0; i < batchCount; i++) {
        const { offset, limit } = getBatchRange(i, batchSize);
        const batch = await loadBatch(offset, limit);
        results.push(...batch);

        if (onProgress) {
            onProgress(results.length, totalCount);
        }
    }

    return results;
}
