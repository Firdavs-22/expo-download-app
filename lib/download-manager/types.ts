/**
 * Type definitions and interfaces for Download Manager
 * Provides type safety for all download operations
 */

/**
 * Possible statuses of a download task
 */
export enum DownloadStatus {
    PENDING = 'pending',       // Task created but not started
    DOWNLOADING = 'downloading', // Currently downloading
    PAUSED = 'paused',         // Paused by user
    COMPLETED = 'completed',   // Successfully completed
    FAILED = 'failed',         // Failed due to error
    CANCELLED = 'cancelled',   // Cancelled by user
}

/**
 * Network connection state
 */
export enum NetworkState {
    ONLINE = 'online',
    OFFLINE = 'offline',
    UNKNOWN = 'unknown',
}

/**
 * Download task event types
 */
export enum DownloadEvent {
    PROGRESS = 'progress',           // Progress update
    STATUS_CHANGE = 'status-change', // Status changed
    COMPLETED = 'completed',         // Download completed
    ERROR = 'error',                 // Error occurred
    CANCELLED = 'cancelled',         // Download cancelled
}

/**
 * Main download task interface
 * Represents a single download operation
 */
export interface DownloadTask {
    id: string;                      // Unique task identifier
    url: string;                     // Source URL
    fileName: string;                // Generated file name
    filePath: string;                // Full path where file will be saved
    status: DownloadStatus;          // Current status
    progress: number;                // Progress percentage (0-100)
    totalBytes: number;              // Total file size in bytes
    downloadedBytes: number;         // Downloaded bytes so far
    createdAt: number;               // Timestamp when task was created
    startedAt?: number;              // Timestamp when download started
    completedAt?: number;            // Timestamp when download completed
    error?: DownloadError;           // Error information if failed
    resumeData?: string;             // Data needed for resume (internal)
}

/**
 * Download error information
 */
export interface DownloadError {
    code: string;                    // Error code
    message: string;                 // Human-readable message
    timestamp: number;               // When error occurred
    retryCount?: number;             // Number of retries attempted
}

/**
 * Options for creating a new download
 */
export interface DownloadOptions {
    fileName?: string;               // Custom file name (optional)
    headers?: Record<string, string>; // Custom HTTP headers
    priority?: number;               // Queue priority (higher = first)
}

/**
 * Configuration for Download Manager
 */
export interface DownloadManagerConfig {
    maxConcurrentDownloads: number;  // Max simultaneous downloads
    timeoutMs: number;               // Request timeout in milliseconds
    maxRetryAttempts: number;        // Max retry attempts on failure
    progressUpdateThrottleMs: number; // Min time between progress updates
    autoRetryOnNetworkRestore: boolean; // Auto retry when network comes back
}

/**
 * Event callback types for type safety
 */
export type DownloadProgressCallback = (task: DownloadTask) => void;
export type DownloadStatusCallback = (task: DownloadTask, oldStatus: DownloadStatus) => void;
export type DownloadCompleteCallback = (task: DownloadTask) => void;
export type DownloadErrorCallback = (task: DownloadTask, error: DownloadError) => void;
export type DownloadCancelledCallback = (task: DownloadTask) => void;

/**
 * Event listener map for type checking
 */
export interface DownloadEventMap {
    [DownloadEvent.PROGRESS]: DownloadProgressCallback;
    [DownloadEvent.STATUS_CHANGE]: DownloadStatusCallback;
    [DownloadEvent.COMPLETED]: DownloadCompleteCallback;
    [DownloadEvent.ERROR]: DownloadErrorCallback;
    [DownloadEvent.CANCELLED]: DownloadCancelledCallback;
}

/**
 * Queue item interface for internal queue management
 */
export interface QueueItem {
    taskId: string;
    priority: number;
    addedAt: number;
}

/**
 * Storage metadata for persisted tasks
 */
export interface StorageMetadata {
    taskId: string;
    filePath: string;
    url: string;
    savedAt: number;
}
