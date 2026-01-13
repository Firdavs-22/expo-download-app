/**
 * Download Queue
 * Manages the queue of pending downloads and concurrent execution
 */

import { DEFAULT_CONFIG } from './constants';
import { QueueItem } from './types';

export class DownloadQueue {
    private queue: QueueItem[] = [];
    private activeDownloads: Set<string> = new Set();
    private maxConcurrent: number;

    constructor(maxConcurrent: number = DEFAULT_CONFIG.maxConcurrentDownloads) {
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Add a task to the queue
     */
    public add(taskId: string, priority: number = 0): void {
        const item: QueueItem = {
            taskId,
            priority,
            addedAt: Date.now(),
        };

        // Insert based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(q => q.priority < priority);
        if (insertIndex === -1) {
            this.queue.push(item);
        } else {
            this.queue.splice(insertIndex, 0, item);
        }
    }

    /**
     * Remove a task from the queue
     */
    public remove(taskId: string): void {
        this.queue = this.queue.filter(item => item.taskId !== taskId);
        this.activeDownloads.delete(taskId);
    }

    /**
     * Get next task to download
     * Returns null if max concurrent limit reached or queue is empty
     */
    public getNext(): string | null {
        if (this.activeDownloads.size >= this.maxConcurrent) {
            return null;
        }

        if (this.queue.length === 0) {
            return null;
        }

        const item = this.queue.shift();
        if (item) {
            this.activeDownloads.add(item.taskId);
            return item.taskId;
        }

        return null;
    }

    /**
     * Mark a download as completed (removes from active set)
     */
    public complete(taskId: string): void {
        this.activeDownloads.delete(taskId);
    }

    /**
     * Check if a task is currently active
     */
    public isActive(taskId: string): boolean {
        return this.activeDownloads.has(taskId);
    }

    /**
     * Get number of active downloads
     */
    public getActiveCount(): number {
        return this.activeDownloads.size;
    }

    /**
     * Get number of pending tasks in queue
     */
    public getPendingCount(): number {
        return this.queue.length;
    }

    /**
     * Check if there's capacity for more downloads
     */
    public hasCapacity(): boolean {
        return this.activeDownloads.size < this.maxConcurrent;
    }

    /**
     * Clear the entire queue
     */
    public clear(): void {
        this.queue = [];
        this.activeDownloads.clear();
    }

    /**
     * Get all queued task IDs
     */
    public getQueuedTaskIds(): string[] {
        return this.queue.map(item => item.taskId);
    }

    /**
     * Get all active task IDs
     */
    public getActiveTaskIds(): string[] {
        return Array.from(this.activeDownloads);
    }
}
