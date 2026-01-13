/**
 * useDownload Hook
 * Hook for tracking a specific download task
 */

import { useCallback, useEffect, useState } from 'react';
import { DownloadManager } from '../DownloadManager';
import type { DownloadError, DownloadStatus, DownloadTask } from '../types';

export interface UseDownloadReturn {
    task: DownloadTask | null;
    progress: number;
    status: DownloadStatus | null;
    error: DownloadError | null;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    cancel: () => Promise<void>;
}

/**
 * Hook for tracking a single download
 * @param taskId - The task ID to track
 */
export function useDownload(taskId: string | null): UseDownloadReturn {
    const [task, setTask] = useState<DownloadTask | null>(null);
    const [manager] = useState(() => DownloadManager.getInstance());

    // Update task state
    const updateTask = useCallback(() => {
        if (!taskId) {
            setTask(null);
            return;
        }
        const currentTask = manager.getTask(taskId);
        setTask(currentTask || null);
    }, [taskId, manager]);

    // Setup event listeners for this specific task
    useEffect(() => {
        if (!taskId) {
            setTask(null);
            return;
        }

        // Initial load
        updateTask();

        // Listen to events
        const handleProgress = (updatedTask: DownloadTask) => {
            if (updatedTask.id === taskId) {
                setTask({ ...updatedTask });
            }
        };

        const handleStatusChange = (updatedTask: DownloadTask) => {
            if (updatedTask.id === taskId) {
                setTask({ ...updatedTask });
            }
        };

        const handleCompleted = (updatedTask: DownloadTask) => {
            if (updatedTask.id === taskId) {
                setTask({ ...updatedTask });
            }
        };

        const handleError = (updatedTask: DownloadTask) => {
            if (updatedTask.id === taskId) {
                setTask({ ...updatedTask });
            }
        };

        manager.on('progress', handleProgress);
        manager.on('status-change', handleStatusChange);
        manager.on('completed', handleCompleted);
        manager.on('error', handleError);

        return () => {
            manager.off('progress', handleProgress);
            manager.off('status-change', handleStatusChange);
            manager.off('completed', handleCompleted);
            manager.off('error', handleError);
        };
    }, [taskId, manager, updateTask]);

    // Pause this download
    const pause = useCallback(async () => {
        if (!taskId) return;
        await manager.pause(taskId);
    }, [taskId, manager]);

    // Resume this download
    const resume = useCallback(async () => {
        if (!taskId) return;
        await manager.resume(taskId);
    }, [taskId, manager]);

    // Cancel this download
    const cancel = useCallback(async () => {
        if (!taskId) return;
        await manager.cancel(taskId);
    }, [taskId, manager]);

    return {
        task,
        progress: task?.progress || 0,
        status: task?.status || null,
        error: task?.error || null,
        pause,
        resume,
        cancel,
    };
}
