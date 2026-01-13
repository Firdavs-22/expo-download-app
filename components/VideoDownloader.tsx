/**
 * Video Downloader Component
 * Example UI component demonstrating how to use the download manager
 */

import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { DownloadStatus, DownloadTask } from '../lib/download-manager';
import { formatFileSize, useDownloadManager } from '../lib/download-manager';
import { DOWNLOAD_DIRECTORY } from '../lib/download-manager/constants';

// Preset video URLs for quick testing
const PRESET_VIDEOS = [
    {
        url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        name: 'For Bigger Escapes',
        size: '2 MB'
    },
    {
        url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        name: 'For Bigget Fun',
        size: '12 MB'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        name: '🔥 For Bigger Blazes',
        size: '2 MB'
    },
    {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        name: '🎬 Sintel',
        size: '181 MB'
    },
];

export function VideoDownloader() {
    const [url, setUrl] = useState('');
    const [playingVideoUri, setPlayingVideoUri] = useState<string | null>(null);
    const {
        getAllDownloads,
        startDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
    } = useDownloadManager();

    const downloads = getAllDownloads();

    const handleStartDownload = async () => {
        if (!url.trim()) return;

        try {
            await startDownload(url.trim());
            setUrl(''); // Clear input after starting
        } catch (error: any) {
            alert(`Failed to start download: ${error.message}`);
        }
    };

    const handleQuickDownload = async (videoUrl: string) => {
        try {
            await startDownload(videoUrl);
        } catch (error: any) {
            alert(`Failed to start download: ${error.message}`);
        }
    };

    const handleDeleteFile = async (task: DownloadTask) => {
        try {
            await cancelDownload(task.id);
            alert('File deleted successfully');
        } catch (error: any) {
            alert(`Failed to delete file: ${error.message}`);
        }
    };

    const renderDownloadItem = ({ item }: { item: DownloadTask }) => {
        return <DownloadItem
            task={item}
            onPause={() => pauseDownload(item.id)}
            onResume={() => resumeDownload(item.id)}
            onCancel={() => cancelDownload(item.id)}
            onDelete={() => handleDeleteFile(item)}
            onPlay={(uri) => setPlayingVideoUri(uri)}
        />;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Video Download Manager</Text>

            {/* Quick Download Section */}
            <View style={styles.quickDownloadContainer}>
                <Text style={styles.sectionTitle}>QUICK DOWNLOAD</Text>
                <View style={styles.quickButtonsRow}>
                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => handleQuickDownload(PRESET_VIDEOS[0].url)}
                    >
                        <Text style={styles.quickButtonText}>{PRESET_VIDEOS[0].name}</Text>
                        <Text style={styles.quickButtonSize}>{PRESET_VIDEOS[0].size}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => handleQuickDownload(PRESET_VIDEOS[1].url)}
                    >
                        <Text style={styles.quickButtonText}>{PRESET_VIDEOS[1].name}</Text>
                        <Text style={styles.quickButtonSize}>{PRESET_VIDEOS[1].size}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.quickButtonsRow}>
                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => handleQuickDownload(PRESET_VIDEOS[2].url)}
                    >
                        <Text style={styles.quickButtonText}>{PRESET_VIDEOS[2].name}</Text>
                        <Text style={styles.quickButtonSize}>{PRESET_VIDEOS[2].size}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickButton}
                        onPress={() => handleQuickDownload(PRESET_VIDEOS[3].url)}
                    >
                        <Text style={styles.quickButtonText}>{PRESET_VIDEOS[3].name}</Text>
                        <Text style={styles.quickButtonSize}>{PRESET_VIDEOS[3].size}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Storage Actions */}
            <View style={styles.storageActions}>
                <TouchableOpacity
                    style={styles.storageButton}
                    onPress={async () => {
                        try {
                            const files = await FileSystem.readDirectoryAsync(DOWNLOAD_DIRECTORY);
                            if (files.length === 0) {
                                alert('Storage is empty');
                            } else {
                                alert(`Files in Storage (${files.length}):\n\n${files.join('\n')}`);
                            }
                        } catch (error: any) {
                            alert(`Error reading storage: ${error.message}`);
                        }
                    }}
                >
                    <Text style={styles.storageButtonText}>📂 Show All Files in Storage</Text>
                </TouchableOpacity>
            </View>


            {/* URL Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter video URL..."
                    placeholderTextColor="#999"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleStartDownload}
                    disabled={!url.trim()}
                >
                    <Text style={styles.addButtonText}>Download</Text>
                </TouchableOpacity>
            </View>

            {/* Downloads List */}
            <FlatList
                data={downloads}
                renderItem={renderDownloadItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No downloads yet. Try quick download buttons above!</Text>
                }
                contentContainerStyle={styles.listContent}
            />

            {/* Video Player Modal */}
            <Modal
                visible={!!playingVideoUri}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setPlayingVideoUri(null)}
            >
                <View style={styles.videoPlayerContainer}>
                    <Video
                        source={{ uri: playingVideoUri || '' }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        useNativeControls
                        style={styles.video}
                        onError={(e) => {
                            console.error("Video error:", e);
                            alert('Error playing video. Check console for details.');
                        }}
                    />
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setPlayingVideoUri(null)}
                    >
                        <Text style={styles.closeButtonText}>Close Player</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

interface DownloadItemProps {
    task: DownloadTask;
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onPlay: (uri: string) => void;
}

function DownloadItem({ task, onPause, onResume, onCancel, onDelete, onPlay }: DownloadItemProps) {
    const handleShowFile = async () => {
        // Show alert with file path
        alert(`File location:\n${task.filePath}\n\nFile saved successfully!`);
    };

    const handlePlayVideo = async () => {
        if (task.filePath) {
            onPlay(task.filePath);
        } else {
            alert('File path is missing');
        }
    };

    const getStatusColor = (status: DownloadStatus): string => {
        switch (status) {
            case 'downloading': return '#4CAF50';
            case 'completed': return '#2196F3';
            case 'paused': return '#FF9800';
            case 'failed': return '#F44336';
            case 'cancelled': return '#9E9E9E';
            default: return '#757575';
        }
    };

    const getStatusText = (status: DownloadStatus): string => {
        switch (status) {
            case 'downloading': return 'Downloading';
            case 'completed': return 'Completed';
            case 'paused': return 'Paused';
            case 'failed': return 'Failed';
            case 'cancelled': return 'Cancelled';
            case 'pending': return 'Pending';
            default: return status;
        }
    };

    const canPause = task.status === 'downloading';
    const canResume = task.status === 'paused' || task.status === 'failed';
    const canCancel = task.status !== 'completed' && task.status !== 'cancelled';

    return (
        <View style={styles.downloadItem}>
            {/* File Info */}
            <View style={styles.downloadInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                    {task.fileName}
                </Text>
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                    </View>
                    {task.totalBytes > 0 && (
                        <Text style={styles.sizeText}>
                            {formatFileSize(task.downloadedBytes)} / {formatFileSize(task.totalBytes)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Progress Bar */}
            {task.status === 'downloading' || task.status === 'paused' ? (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${task.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{task.progress}%</Text>
                </View>
            ) : null}

            {/* Error Message */}
            {task.error && (
                <Text style={styles.errorText}>{task.error.message}</Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
                {canPause && (
                    <TouchableOpacity style={styles.actionButton} onPress={onPause}>
                        <Text style={styles.actionButtonText}>⏸ Pause</Text>
                    </TouchableOpacity>
                )}
                {canResume && (
                    <TouchableOpacity style={[styles.actionButton, styles.resumeButton]} onPress={onResume}>
                        <Text style={styles.actionButtonText}>▶️ Resume</Text>
                    </TouchableOpacity>
                )}
                {canCancel && (
                    <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
                        <Text style={styles.actionButtonText}>✕ Cancel</Text>
                    </TouchableOpacity>
                )}
                {task.status === 'completed' && (
                    <>
                        <TouchableOpacity style={[styles.actionButton, styles.playButton]} onPress={handlePlayVideo}>
                            <Text style={styles.actionButtonText}>▶ Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.infoButton]} onPress={handleShowFile}>
                            <Text style={styles.actionButtonText}>📁 Show</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
                            <Text style={styles.actionButtonText}>🗑 Delete</Text>
                        </TouchableOpacity>
                    </>
                )}
                {task.status === 'downloading' && (
                    <ActivityIndicator size="small" color="#4CAF50" style={styles.spinner} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    quickDownloadContainer: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        marginBottom: 12,
        letterSpacing: 1,
    },
    quickButtonsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    quickButton: {
        flex: 1,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#2196F3',
        alignItems: 'center',
        minHeight: 60,
        justifyContent: 'center',
    },
    quickButtonText: {
        color: '#1976D2',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    quickButtonSize: {
        color: '#64B5F6',
        fontSize: 11,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        gap: 10,
    },
    input: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        backgroundColor: '#fafafa',
    },
    addButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 20,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 15,
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        marginTop: 50,
    },
    downloadItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    downloadInfo: {
        marginBottom: 10,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    sizeText: {
        fontSize: 12,
        color: '#666',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        minWidth: 40,
        textAlign: 'right',
    },
    errorText: {
        color: '#F44336',
        fontSize: 12,
        marginBottom: 10,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#757575',
    },
    resumeButton: {
        backgroundColor: '#4CAF50',
    },
    cancelButton: {
        backgroundColor: '#F44336',
    },
    playButton: {
        backgroundColor: '#9C27B0', // Purple for play
    },
    infoButton: {
        backgroundColor: '#607D8B', // Blue-grey for info
    },
    deleteButton: {
        backgroundColor: '#E91E63', // Pink for delete
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    spinner: {
        marginLeft: 'auto',
    },
    storageActions: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    storageButton: {
        backgroundColor: '#607D8B',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    storageButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    videoPlayerContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: Dimensions.get('window').width,
        height: 300,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
