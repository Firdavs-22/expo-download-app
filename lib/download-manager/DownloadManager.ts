/**
 * Download Manager
 * Main singleton class for managing video downloads
 * Provides pause/resume/cancel functionality with event-based updates
 */

import EventEmitter from 'eventemitter3';
import * as FileSystem from 'expo-file-system/legacy';
import { DownloadQueue } from './DownloadQueue';
import { NetworkMonitor } from './NetworkMonitor';
import { StorageManager } from './StorageManager';
import { DEFAULT_CONFIG, ERROR_CODES } from './constants';
import {
    DownloadError,
    DownloadEvent,
    DownloadManagerConfig,
    DownloadOptions,
    DownloadStatus,
    DownloadTask
} from './types';
import {
    generateTaskId,
    hasEnoughStorage,
    sanitizeFileName,
    throttle,
    validateUrl,
} from './utils';

export class DownloadManager extends EventEmitter {
    private static instance: DownloadManager;

    private tasks: Map<string, DownloadTask> = new Map();
    private downloads: Map<string, any> = new Map(); // FileSystem.DownloadResumable не экспортируется
    private queue: DownloadQueue;
    private storage: StorageManager;
    private network: NetworkMonitor;
    private config: DownloadManagerConfig;
    private isInitialized = false;

    private constructor(config: Partial<DownloadManagerConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.queue = new DownloadQueue(this.config.maxConcurrentDownloads);
        this.storage = StorageManager.getInstance();
        this.network = NetworkMonitor.getInstance();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(config?: Partial<DownloadManagerConfig>): DownloadManager {
        if (!DownloadManager.instance) {
            DownloadManager.instance = new DownloadManager(config);
        }
        return DownloadManager.instance;
    }

    /**
     * Initialize the download manager
     * Must be called before using
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Initialize storage
        await this.storage.initialize();

        // Load persisted tasks
        const savedTasks = await this.storage.loadTasks();
        for (const task of savedTasks) {
            // Reset downloading status to paused on app restart
            if (task.status === DownloadStatus.DOWNLOADING) {
                task.status = DownloadStatus.PAUSED;
            }
            this.tasks.set(task.id, task);
        }

        // Start network monitoring
        await this.network.startMonitoring();

        // Handle network state changes
        this.network.on('online', () => this.handleNetworkOnline());
        this.network.on('offline', () => this.handleNetworkOffline());

        this.isInitialized = true;
    }

    /**
     * Start a new download
     */
    public async download(url: string, options: DownloadOptions = {}): Promise<string> {
        // Validate URL
        if (!validateUrl(url)) {
            throw new Error(`${ERROR_CODES.INVALID_URL}: Invalid URL format`);
        }

        // Generate task ID and file info
        const taskId = generateTaskId();
        const fileName = sanitizeFileName(url, options.fileName);
        const filePath = this.storage.getFilePath(fileName);

        // Create task
        const task: DownloadTask = {
            id: taskId,
            url,
            fileName,
            filePath,
            status: DownloadStatus.PENDING,
            progress: 0,
            totalBytes: 0,
            downloadedBytes: 0,
            createdAt: Date.now(),
        };

        this.tasks.set(taskId, task);
        await this.storage.saveMetadata(task);

        // Add to queue
        this.queue.add(taskId, options.priority || 0);

        // Try to start download immediately if capacity available
        this.processQueue();

        return taskId;
    }

    /**
     * Pause a download
     */
    public async pause(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        if (task.status !== DownloadStatus.DOWNLOADING) {
            return; // Already paused or not downloading
        }

        const downloadResumable = this.downloads.get(taskId);
        if (downloadResumable) {
            try {
                const pauseResult = await downloadResumable.pauseAsync();

                // Store resume data (handle both Android object with resumeData and other formats)
                if (typeof pauseResult === 'object' && pauseResult !== null && 'resumeData' in pauseResult) {
                    task.resumeData = pauseResult.resumeData;
                } else {
                    task.resumeData = JSON.stringify(pauseResult);
                }

                this.updateTaskStatus(taskId, DownloadStatus.PAUSED);
                await this.persistTasks();

                this.queue.complete(taskId);
                this.downloads.delete(taskId);

                // Process queue to start next download
                this.processQueue();
            } catch (error) {
                console.error('Failed to pause download:', error);
            }
        }
    }

    /**
     * Resume a paused download
     */
    public async resume(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        if (task.status !== DownloadStatus.PAUSED && task.status !== DownloadStatus.FAILED) {
            return; // Not in resumable state
        }

        // Check network
        if (!this.network.isOnline()) {
            throw new Error('No network connection');
        }

        // Reset error if resuming from failed state
        if (task.status === DownloadStatus.FAILED) {
            delete task.error;
        }

        // Update status and add back to queue
        this.updateTaskStatus(taskId, DownloadStatus.PENDING);
        this.queue.add(taskId);
        this.processQueue();
    }

    /**
     * Cancel a download
     */
    public async cancel(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        // Stop download if active
        const downloadResumable = this.downloads.get(taskId);
        if (downloadResumable) {
            try {
                await downloadResumable.pauseAsync();
            } catch (error) {
                console.error('Error pausing during cancel:', error);
            }
            this.downloads.delete(taskId);
        }

        // Remove from queue
        this.queue.remove(taskId);

        // Delete file
        await this.storage.deleteFile(task.filePath);
        await this.storage.deleteMetadata(taskId);

        // Update status
        this.updateTaskStatus(taskId, DownloadStatus.CANCELLED);

        // Emit cancelled event
        this.emit(DownloadEvent.CANCELLED, task);

        // Remove from tasks
        this.tasks.delete(taskId);

        // Save state
        await this.persistTasks();

        // Process queue to start next download
        this.processQueue();
    }

    /**
     * Get a specific task
     */
    public getTask(taskId: string): DownloadTask | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * Get all tasks
     */
    public getAllTasks(): DownloadTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * Get active downloads
     */
    public getActiveDownloads(): DownloadTask[] {
        return this.getAllTasks().filter(
            task => task.status === DownloadStatus.DOWNLOADING
        );
    }

    /**
     * Process the download queue
     */
    private processQueue(): void {
        while (this.queue.hasCapacity()) {
            const taskId = this.queue.getNext();
            if (!taskId) break;

            this.startDownload(taskId);
        }
    }

    /**
     * Start downloading a specific task
     */
    private async startDownload(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) return;

        try {
            // Check storage space
            if (task.totalBytes > 0) {
                const hasSpace = await hasEnoughStorage(task.totalBytes);
                if (!hasSpace) {
                    this.handleDownloadError(taskId, {
                        code: ERROR_CODES.INSUFFICIENT_STORAGE,
                        message: 'Insufficient storage space',
                        timestamp: Date.now(),
                    });
                    return;
                }
            }

            // Update status
            this.updateTaskStatus(taskId, DownloadStatus.DOWNLOADING);
            task.startedAt = Date.now();

            // Create download progress callback with throttling
            const progressCallback = throttle(
                (downloadProgress: any) => {
                    this.handleProgress(taskId, downloadProgress);
                },
                this.config.progressUpdateThrottleMs
            );

            // Create resumable download
            const downloadResumable = FileSystem.createDownloadResumable(
                task.url,
                task.filePath,
                {},
                progressCallback,
                task.resumeData
            );

            this.downloads.set(taskId, downloadResumable);

            // Start download
            const result = await downloadResumable.downloadAsync();

            if (result) {
                // Download completed successfully
                task.completedAt = Date.now();
                task.progress = 100;
                delete task.resumeData; // Cleanup resume data
                this.updateTaskStatus(taskId, DownloadStatus.COMPLETED);
                this.queue.complete(taskId);
                this.downloads.delete(taskId);

                this.emit(DownloadEvent.COMPLETED, task);
                await this.persistTasks();

                // Process next in queue
                this.processQueue();
            }
        } catch (error: any) {
            this.handleDownloadError(taskId, {
                code: ERROR_CODES.NETWORK_ERROR,
                message: error.message || 'Download failed',
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Handle download progress
     */
    private handleProgress(
        taskId: string,
        progress: any // DownloadProgressData { totalBytesWritten, totalBytesExpectedToWrite }
    ): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.totalBytes = progress.totalBytesExpectedToWrite;
        task.downloadedBytes = progress.totalBytesWritten;
        task.progress = Math.round(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );

        this.emit(DownloadEvent.PROGRESS, task);
    }

    /**
     * Handle download error
     */
    private handleDownloadError(taskId: string, error: DownloadError): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.error = error;
        this.updateTaskStatus(taskId, DownloadStatus.FAILED);
        this.queue.complete(taskId);
        this.downloads.delete(taskId);

        this.emit(DownloadEvent.ERROR, task, error);
        this.persistTasks();

        // Process next in queue
        this.processQueue();
    }

    /**
     * Update task status
     */
    private updateTaskStatus(taskId: string, newStatus: DownloadStatus): void {
        const task = this.tasks.get(taskId);
        if (!task) return;

        const oldStatus = task.status;
        task.status = newStatus;

        this.emit(DownloadEvent.STATUS_CHANGE, task, oldStatus);
    }

    /**
     * Handle network coming online
     */
    private handleNetworkOnline(): void {
        if (!this.config.autoRetryOnNetworkRestore) return;

        // Resume paused downloads due to network loss
        const failedTasks = this.getAllTasks().filter(
            task => task.status === DownloadStatus.FAILED &&
                task.error?.code === ERROR_CODES.NETWORK_ERROR
        );

        for (const task of failedTasks) {
            this.resume(task.id).catch(err =>
                console.error('Failed to auto-resume:', err)
            );
        }
    }

    /**
     * Handle network going offline
     */
    private handleNetworkOffline(): void {
        // Pause all active downloads
        const activeDownloads = this.getActiveDownloads();
        for (const task of activeDownloads) {
            this.pause(task.id).catch(err =>
                console.error('Failed to pause on network loss:', err)
            );
        }
    }

    /**
     * Persist tasks to storage
     */
    private async persistTasks(): Promise<void> {
        await this.storage.saveTasks(this.tasks);
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        // Pause all active downloads
        const activeDownloads = this.getActiveDownloads();
        for (const task of activeDownloads) {
            await this.pause(task.id);
        }

        // Persist state
        await this.persistTasks();

        // Stop network monitoring
        this.network.stopMonitoring();
    }
}
