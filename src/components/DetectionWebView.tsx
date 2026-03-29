/**
 * DetectionWebView — a hidden WebView that runs TF.js + COCO-SSD on-device.
 *
 * Usage:
 *   const ref = useRef<DetectionWebViewHandle>(null);
 *   <DetectionWebView ref={ref} />
 *   const objects = await ref.current.detect(base64ImageUri);
 */

import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { DETECTION_HTML, DetectedObject } from '../utils/objectDetection';

export interface DetectionWebViewHandle {
    detect(imageDataUri: string): Promise<DetectedObject[]>;
    isReady(): boolean;
}

interface PendingDetection {
    resolve: (objects: DetectedObject[]) => void;
    reject:  (err: Error) => void;
    timer:   ReturnType<typeof setTimeout>;
}

const DetectionWebView = forwardRef<DetectionWebViewHandle>((_, ref) => {
    const webviewRef  = useRef<WebView>(null);
    const iframeRef   = useRef<HTMLIFrameElement | null>(null);
    const ready       = useRef(false);
    const pending     = useRef<PendingDetection | null>(null);

    // ── Expose handle ────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        isReady: () => ready.current,

        detect(imageDataUri: string): Promise<DetectedObject[]> {
            return new Promise((resolve, reject) => {
                if (!ready.current) {
                    reject(new Error('Detection engine not ready yet. Please wait a moment and try again.'));
                    return;
                }
                // Cancel any previous pending detection
                if (pending.current) {
                    clearTimeout(pending.current.timer);
                    pending.current.reject(new Error('Cancelled'));
                }
                const timer = setTimeout(() => {
                    pending.current = null;
                    reject(new Error('Detection timed out. Check your internet connection (model loads from CDN).'));
                }, 30000);

                pending.current = { resolve, reject, timer };

                const msg = JSON.stringify({ type: 'detect', imageData: imageDataUri });

                if (Platform.OS === 'web') {
                    iframeRef.current?.contentWindow?.postMessage(msg, '*');
                } else {
                    webviewRef.current?.postMessage(msg);
                }
            });
        },
    }));

    // ── Message handler ──────────────────────────────────────────────────────
    const handleMessage = useCallback((raw: string) => {
        let data: any;
        try { data = JSON.parse(raw); } catch { return; }

        if (data.type === 'ready') {
            ready.current = true;
            return;
        }
        if (!pending.current) return;

        const { resolve, reject, timer } = pending.current;
        pending.current = null;
        clearTimeout(timer);

        if (data.type === 'result') {
            resolve(data.objects as DetectedObject[]);
        } else if (data.type === 'error') {
            reject(new Error(data.message));
        }
    }, []);

    // ── Web platform: use a hidden iframe ────────────────────────────────────
    if (Platform.OS === 'web') {
        return (
            <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
                <WebViewIframe
                    html={DETECTION_HTML}
                    iframeRef={iframeRef}
                    onMessage={handleMessage}
                />
            </View>
        );
    }

    // ── Native: use react-native-webview ─────────────────────────────────────
    return (
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                source={{ html: DETECTION_HTML }}
                onMessage={e => handleMessage(e.nativeEvent.data)}
                javaScriptEnabled
                // Allow CDN loads
                mixedContentMode="always"
                style={{ width: 1, height: 1, opacity: 0 }}
            />
        </View>
    );
});

// ── Web iframe wrapper ────────────────────────────────────────────────────────
function WebViewIframe({
    html,
    iframeRef,
    onMessage,
}: {
    html: string;
    iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
    onMessage: (msg: string) => void;
}) {
    const blobUrl = React.useMemo(() => {
        const blob = new Blob([html], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }, [html]);

    React.useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (typeof e.data === 'string') onMessage(e.data);
        };
        window.addEventListener('message', handler);
        return () => {
            window.removeEventListener('message', handler);
            URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl, onMessage]);

    return (
        <iframe
            ref={iframeRef}
            src={blobUrl}
            style={{ width: 1, height: 1, border: 'none', position: 'absolute', opacity: 0 }}
            sandbox="allow-scripts allow-same-origin"
            title="detection-engine"
        />
    );
}

export default DetectionWebView;
