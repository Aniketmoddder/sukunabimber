import { validateApiKey } from '../../lib/auth.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    // Validate main key
    const authResult = validateApiKey(req.headers);
    if (!authResult.valid) {
        return res.status(401).json({ 
            success: false, 
            error: authResult.error 
        });
    }

    // Check if it's the main key (Toji)
    const keyData = global.apiKeys.get(authResult.key);
    if (!keyData.isMaster) {
        return res.status(403).json({
            success: false,
            error: "Only main key (Toji) can generate new keys"
        });
    }

    try {
        const { owner, limit = 1000 } = req.body;

        if (!owner || typeof owner !== 'string') {
            return res.status(400).json({
                success: false,
                error: "Owner name is required (string)"
            });
        }

        // Generate secure API key
        const newKey = 'SK_' + crypto.randomBytes(24).toString('hex');
        const keyId = Date.now();
        
        // Store the key
        global.apiKeys.set(newKey, {
            id: keyId,
            key: newKey,
            owner: owner.trim(),
            requests: 0,
            limit: Math.min(parseInt(limit) || 1000, 5000), // Max 5000 requests
            createdAt: Date.now(),
            isActive: true,
            isMaster: false,
            generatedBy: authResult.key
        });

        return res.status(201).json({
            success: true,
            message: "API key generated successfully",
            key: newKey,
            details: {
                owner: owner.trim(),
                limit: Math.min(parseInt(limit) || 1000, 5000),
                createdAt: new Date().toISOString(),
                expires: "Never (manual deactivation only)",
                note: "Store this key securely. It cannot be retrieved again."
            },
            usage: {
                method: "Include in header: x-api-key: YOUR_KEY",
                example: "curl -X POST https://your-api.vercel.app/api/bomb \\\n  -H 'x-api-key: " + newKey + "' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"phone\": \"9805696906\", \"iterations\": 2}'"
            }
        });

    } catch (error) {
        console.error("Key generation error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to generate API key"
        });
    }
}
