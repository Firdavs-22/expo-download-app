/**
 * Network Monitor
 * Monitors network connectivity and notifies when state changes
 */

import EventEmitter from 'eventemitter3';
import * as Network from 'expo-network';
import { TIMING } from './constants';
import { NetworkState } from './types';

export class NetworkMonitor extends EventEmitter {
    private static instance: NetworkMonitor;
    private currentState: NetworkState = NetworkState.UNKNOWN;
    private checkInterval: any = null;
    private isMonitoring = false;

    private constructor() {
        super();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): NetworkMonitor {
        if (!NetworkMonitor.instance) {
            NetworkMonitor.instance = new NetworkMonitor();
        }
        return NetworkMonitor.instance;
    }

    /**
     * Start monitoring network state
     */
    public async startMonitoring(): Promise<void> {
        if (this.isMonitoring) return;

        this.isMonitoring = true;

        // Initial check
        await this.checkNetworkState();

        // Periodic checks
        this.checkInterval = setInterval(async () => {
            await this.checkNetworkState();
        }, TIMING.NETWORK_CHECK_INTERVAL_MS);
    }

    /**
     * Stop monitoring
     */
    public stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
    }

    /**
     * Check current network state
     */
    private async checkNetworkState(): Promise<void> {
        try {
            const networkState = await Network.getNetworkStateAsync();
            const newState = networkState.isConnected && networkState.isInternetReachable
                ? NetworkState.ONLINE
                : NetworkState.OFFLINE;

            if (newState !== this.currentState) {
                const oldState = this.currentState;
                this.currentState = newState;
                this.emit('state-change', newState, oldState);

                if (newState === NetworkState.ONLINE) {
                    this.emit('online');
                } else {
                    this.emit('offline');
                }
            }
        } catch (error) {
            console.error('Network check failed:', error);
            this.currentState = NetworkState.UNKNOWN;
        }
    }

    /**
     * Get current network state
     */
    public getCurrentState(): NetworkState {
        return this.currentState;
    }

    /**
     * Check if currently online
     */
    public isOnline(): boolean {
        return this.currentState === NetworkState.ONLINE;
    }
}
