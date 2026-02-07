/**
 * Factory function to create the appropriate video provider
 * based on the VIDEO_PROVIDER environment variable.
 *
 * VIDEO_PROVIDER=mock  (default) → MockVideoProvider
 * VIDEO_PROVIDER=veo3             → Veo3Provider
 */

import type { VideoProvider } from './VideoProviderInterface.js';
import { MockVideoProvider } from './MockVideoProvider.js';
import { Veo3Provider } from './Veo3Provider.js';

let cachedProvider: VideoProvider | null = null;

export function createVideoProvider(): VideoProvider {
    if (cachedProvider) return cachedProvider;

    const providerType = process.env.VIDEO_PROVIDER || 'mock';

    switch (providerType) {
        case 'veo3':
            console.log('[VideoProvider] Using Veo3 provider');
            cachedProvider = new Veo3Provider();
            break;
        case 'mock':
        default:
            console.log('[VideoProvider] Using Mock provider');
            cachedProvider = new MockVideoProvider();
            break;
    }

    return cachedProvider;
}
