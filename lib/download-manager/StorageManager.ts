/**
 * Storage Manager
 * Handles file storage, metadata persistence, and cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DOWNLOAD_DIRECTORY, STORAGE_KEYS } from './constants';
import { DownloadTask, StorageMetadata } from './types';
import { deleteFile, ensureDownloadDirectory } from './utils';

export class StorageManager {
    private static instance: StorageManager;

    private constructor() { }

    /**
     * Get singleton instance
     */
    public static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /**
     * Initialize storage (create directories)
     */
    public async initialize(): Promise<void> {
        await ensureDownloadDirectory(DOWNLOAD_DIRECTORY);
    }

    /**
     * Get file path for a task
     */
    public getFilePath(fileName: string): string {
        return `${DOWNLOAD_DIRECTORY}${fileName}`;
    }

    /**
     * Save task metadata
     */
    public async saveMetadata(task: DownloadTask): Promise<void> {
        try {
            const metadata: StorageMetadata = {
                taskId: task.id,
                filePath: task.filePath,
                url: task.url,
                savedAt: Date.now(),
            };

            const existingData = await AsyncStorage.getItem(STORAGE_KEYS.METADATA);
            const allMetadata: Record<string, StorageMetadata> = existingData
                ? JSON.parse(existingData)
                : {};

            allMetadata[task.id] = metadata;
            await AsyncStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(allMetadata));
        } catch (error) {
            console.error('Failed to save metadata:', error);
        }
    }

    /**
     * Get metadata for a task
     */
    public async getMetadata(taskId: string): Promise<StorageMetadata | null> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.METADATA);
            if (!data) return null;

            const allMetadata: Record<string, StorageMetadata> = JSON.parse(data);
            return allMetadata[taskId] || null;
        } catch (error) {
            console.error('Failed to get metadata:', error);
            return null;
        }
    }

    /**
     * Delete metadata for a task
     */
    public async deleteMetadata(taskId: string): Promise<void> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.METADATA);
            if (!data) return;

            const allMetadata: Record<string, StorageMetadata> = JSON.parse(data);
            delete allMetadata[taskId];
            await AsyncStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(allMetadata));
        } catch (error) {
            console.error('Failed to delete metadata:', error);
        }
    }

    /**
     * Save all tasks to storage for persistence
     */
    public async saveTasks(tasks: Map<string, DownloadTask>): Promise<void> {
        try {
            const tasksArray = Array.from(tasks.values());
            await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksArray));
        } catch (error) {
            console.error('Failed to save tasks:', error);
        }
    }

    /**
     * Load tasks from storage
     */
    public async loadTasks(): Promise<DownloadTask[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
            if (!data) return [];

            return JSON.parse(data) as DownloadTask[];
        } catch (error) {
            console.error('Failed to load tasks:', error);
            return [];
        }
    }

    /**
     * Delete a file
     */
    public async deleteFile(filePath: string): Promise<boolean> {
        return deleteFile(filePath);
    }

    /**
     * Check if file exists
     */
    public async fileExists(filePath: string): Promise<boolean> {
        try {
            const info = await FileSystem.getInfoAsync(filePath);
            return info.exists;
        } catch {
            return false;
        }
    }

    /**
     * Get file info
     */
    public async getFileInfo(filePath: string): Promise<any> {
        return FileSystem.getInfoAsync(filePath);
    }

    /**
     * Clean up failed/cancelled downloads
     */
    public async cleanupFailedDownloads(tasks: DownloadTask[]): Promise<void> {
        for (const task of tasks) {
            if (task.status === 'failed' || task.status === 'cancelled') {
                await this.deleteFile(task.filePath);
                await this.deleteMetadata(task.id);
            }
        }
    }
}
