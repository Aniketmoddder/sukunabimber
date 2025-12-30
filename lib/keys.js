import crypto from 'crypto';

// Key management functions
export function createKey(owner, limit = 1000) {
    const key = 'SK_' + crypto.randomBytes(24).toString('hex');
    return {
        key,
        owner,
        limit,
        createdAt: Date.now(),
        isActive: true
    };
}

export function revokeKey(key) {
    if (global.apiKeys.has(key)) {
        global.apiKeys.get(key).isActive = false;
        return true;
    }
    return false;
}
