// API Key validation
export function validateApiKey(headers) {
    const apiKey = headers['x-api-key'] || 
                   headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
        return { valid: false, error: "API key required. Use header: x-api-key" };
    }
    
    // Check if key exists
    if (!global.apiKeys.has(apiKey)) {
        return { valid: false, error: "Invalid API key" };
    }
    
    const keyData = global.apiKeys.get(apiKey);
    
    // Check if key is active
    if (!keyData.isActive) {
        return { valid: false, error: "API key is deactivated" };
    }
    
    // Check rate limit
    if (keyData.requests >= keyData.limit) {
        return { valid: false, error: "Rate limit exceeded. Contact administrator." };
    }
    
    return { valid: true, key: apiKey, data: keyData };
}
