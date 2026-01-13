/**
 * useDownloadManager Hook
 * Main hook for managing multiple downloads
 */

import { useCallback, useEffect, useState } from 'react';
import { DownloadManager } from '../DownloadManager';
import type { DownloadOptions, DownloadTask } from '../types';

export interface UseDownloadManagerReturn {
    downloads: Map<string, DownloadTask>;
    startDownload: (url: string, options?: DownloadOptions) => Promise<string>;
    pauseDownload: (taskId: string) => Promise<void>;
    resumeDownload: (taskId: string) => Promise<void>;
    cancelDownload: (taskId: string) => Promise<void>;
    getDownload: (taskId: string) => DownloadTask | undefined;
    getAllDownloads: () => DownloadTask[];
    getActiveDownloads: () => DownloadTask[];
}

/**
 * Hook for managing downloads
 * Provides reactive state updates when downloads change
 */
export function useDownloadManager(): UseDownloadManagerReturn {
    const [downloads, setDownloads] = useState<Map<string, DownloadTask>>(new Map());
    const [manager] = useState(() => DownloadManager.getInstance());

    // Update state from manager
    const updateDownloads = useCallback(() => {
        const tasks = manager.getAllTasks();
        const taskMap = new Map(tasks.map(task => [task.id, task]));
        setDownloads(taskMap);
    }, [manager]);

    // Setup event listeners
    useEffect(() => {
        // Initialize manager
        manager.initialize().then(() => {
            updateDownloads();
        });

        // Listen to all events and update state
        const handleProgress = () => updateDownloads();
        const handleStatusChange = () => updateDownloads();
        const handleCompleted = () => updateDownloads();
        const handleError = () => updateDownloads();
        const handleCancelled = () => updateDownloads();

        manager.on('progress', handleProgress);
        manager.on('status-change', handleStatusChange);
        manager.on('completed', handleCompleted);
        manager.on('error', handleError);
        manager.on('cancelled', handleCancelled);

        return () => {
            manager.off('progress', handleProgress);
            manager.off('status-change', handleStatusChange);
            manager.off('completed', handleCompleted);
            manager.off('error', handleError);
            manager.off('cancelled', handleCancelled);
        };
    }, [manager, updateDownloads]);

    // Start a new download
    const startDownload = useCallback(
        async (url: string, options?: DownloadOptions): Promise<string> => {
            const taskId = await manager.download(url, options);
            updateDownloads();
            return taskId;
        },
        [manager, updateDownloads]
    );

    // Pause a download
    const pauseDownload = useCallback(
        async (taskId: string): Promise<void> => {
            await manager.pause(taskId);
            updateDownloads();
        },
        [manager, updateDownloads]
    );

    // Resume a download
    const resumeDownload = useCallback(
        async (taskId: string): Promise<void> => {
            await manager.resume(taskId);
            updateDownloads();
        },
        [manager, updateDownloads]
    );

    // Cancel a download
    const cancelDownload = useCallback(
        async (taskId: string): Promise<void> => {
            await manager.cancel(taskId);
            updateDownloads();
        },
        [manager, updateDownloads]
    );

    // Get a specific download
    const getDownload = useCallback(
        (taskId: string): DownloadTask | undefined => {
            return downloads.get(taskId);
        },
        [downloads]
    );

    // Get all downloads
    const getAllDownloads = useCallback((): DownloadTask[] => {
        return Array.from(downloads.values());
    }, [downloads]);

    // Get active downloads
    const getActiveDownloads = useCallback((): DownloadTask[] => {
        return manager.getActiveDownloads();
    }, [manager]);

    return {
        downloads,
        startDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        getDownload,
        getAllDownloads,
        getActiveDownloads,
    };
}
