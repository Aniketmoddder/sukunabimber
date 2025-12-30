import { validateApiKey } from '../../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use GET.' 
        });
    }

    // Validate API key
    const authResult = validateApiKey(req.headers);
    if (!authResult.valid) {
        return res.status(401).json({ 
            success: false, 
            error: authResult.error 
        });
    }

    const keyData = global.apiKeys.get(authResult.key);
    
    // Calculate stats
    let totalRequests = 0;
    let activeKeys = 0;
    
    global.apiKeys.forEach(key => {
        totalRequests += key.requests || 0;
        if (key.isActive) activeKeys++;
    });

    // Get recent attacks (last 10)
    const recentAttacks = global.attackLogs
        .filter(log => log.apiKey === authResult.key)
        .slice(0, 10)
        .map(log => ({
            target: log.phone,
            iterations: log.iterations,
            status: log.status,
            timestamp: log.timestamp,
            requestId: log.requestId
        }));

    return res.status(200).json({
        success: true,
        stats: {
            yourKey: {
                owner: keyData.owner,
                requests: keyData.requests,
                limit: keyData.limit,
                remaining: keyData.limit - keyData.requests,
                createdAt: new Date(keyData.createdAt).toISOString(),
                isActive: keyData.isActive
            },
            system: {
                totalKeys: global.apiKeys.size,
                activeKeys,
                totalRequests,
                recentAttacksCount: recentAttacks.length
            },
            recentAttacks
        },
        note: keyData.isMaster ? "You have master key privileges" : "Standard user key"
    });
}
