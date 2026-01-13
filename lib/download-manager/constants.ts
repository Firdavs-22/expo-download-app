/**
 * Constants and configuration defaults for Download Manager
 */

import * as FileSystem from 'expo-file-system/legacy';
import type { DownloadManagerConfig } from './types';

/**
 * Default configuration for Download Manager
 */
export const DEFAULT_CONFIG: DownloadManagerConfig = {
    maxConcurrentDownloads: 3,          // Max 3 simultaneous downloads
    timeoutMs: 30000,                   // 30 second timeout
    maxRetryAttempts: 3,                // Retry up to 3 times
    progressUpdateThrottleMs: 100,      // Update progress max every 100ms
    autoRetryOnNetworkRestore: true,    // Auto-retry when network returns
};

/**
 * Directory where downloads will be saved
 */
export const DOWNLOAD_DIRECTORY = `${(FileSystem as any).documentDirectory}downloads/`;

/**
 * AsyncStorage keys for persisting data
 */
export const STORAGE_KEYS = {
    TASKS: '@download_manager/tasks',
    QUEUE: '@download_manager/queue',
    METADATA: '@download_manager/metadata',
} as const;

/**
 * Error codes for download failures
 */
export const ERROR_CODES = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
    INVALID_URL: 'INVALID_URL',
    SERVER_ERROR: 'SERVER_ERROR',
    CANCELLED: 'CANCELLED',
    INSUFFICIENT_STORAGE: 'INSUFFICIENT_STORAGE',
    UNKNOWN: 'UNKNOWN',
} as const;

/**
 * HTTP status code ranges
 */
export const HTTP_STATUS = {
    SUCCESS_MIN: 200,
    SUCCESS_MAX: 299,
    CLIENT_ERROR_MIN: 400,
    CLIENT_ERROR_MAX: 499,
    SERVER_ERROR_MIN: 500,
    SERVER_ERROR_MAX: 599,
} as const;

/**
 * File size limits (optional, can be customized)
 */
export const FILE_LIMITS = {
    MAX_FILE_SIZE_MB: 500,  // 500 MB max per file
    MIN_FREE_SPACE_MB: 100, // Require 100 MB free space
} as const;

/**
 * Timing constants
 */
export const TIMING = {
    RETRY_DELAY_MS: 2000,           // Wait 2s before retry
    NETWORK_CHECK_INTERVAL_MS: 5000, // Check network every 5s
    QUEUE_PROCESS_DELAY_MS: 100,    // Small delay between queue processing
} as const;
