/**
 * Utility functions for Download Manager
 */

import * as FileSystem from 'expo-file-system/legacy';

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize URL to create a safe file name
 * Extracts filename from URL and removes invalid characters
 */
export function sanitizeFileName(url: string, customName?: string): string {
    if (customName) {
        // Use custom name but sanitize it
        return customName.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    try {
        // Extract filename from URL
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        let filename = pathname.substring(pathname.lastIndexOf('/') + 1);

        // If no filename in URL, generate one
        if (!filename || filename.length === 0) {
            filename = `video_${Date.now()}`;
        }

        // Sanitize: remove invalid characters
        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

        // Ensure it has an extension, default to .mp4 if none
        if (!filename.includes('.')) {
            filename += '.mp4';
        }

        return filename;
    } catch (error) {
        // If URL parsing fails, generate a generic name
        return `download_${Date.now()}.mp4`;
    }
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate estimated time remaining
 * @param downloadedBytes - Bytes downloaded so far
 * @param totalBytes - Total bytes to download
 * @param startTime - When download started (timestamp)
 * @returns Estimated seconds remaining
 */
export function calculateETA(
    downloadedBytes: number,
    totalBytes: number,
    startTime: number
): number {
    if (downloadedBytes === 0 || totalBytes === 0) return 0;

    const elapsed = Date.now() - startTime;
    const speed = downloadedBytes / (elapsed / 1000); // bytes per second
    const remaining = totalBytes - downloadedBytes;

    return Math.ceil(remaining / speed);
}

/**
 * Format ETA to human-readable string
 */
export function formatETA(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

/**
 * Check if there's enough storage space
 * @param requiredBytes - Bytes needed
 * @returns Promise<boolean>
 */
export async function hasEnoughStorage(requiredBytes: number): Promise<boolean> {
    try {
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        // Require at least 100MB more than needed as buffer
        const buffer = 100 * 1024 * 1024; // 100 MB
        return freeDiskStorage > (requiredBytes + buffer);
    } catch (error) {
        console.error('Failed to check storage:', error);
        return true; // Assume enough space if check fails
    }
}

/**
 * Ensure download directory exists
 */
export async function ensureDownloadDirectory(directory: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
}

/**
 * Delete file safely
 */
export async function deleteFile(filePath: string): Promise<boolean> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to delete file:', error);
        return false;
    }
}

/**
 * Throttle function calls
 * Returns a throttled version of the function that only executes once per interval
 */
export function throttle<T extends (...args: any[]) => void>(
    func: T,
    intervalMs: number
): T {
    let lastCall = 0;
    let timeoutId: any = null;

    return ((...args: any[]) => {
        const now = Date.now();

        if (now - lastCall >= intervalMs) {
            lastCall = now;
            func(...args);
        } else {
            // Clear existing timeout and set a new one
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func(...args);
            }, intervalMs - (now - lastCall));
        }
    }) as T;
}
