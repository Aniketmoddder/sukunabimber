// Extract client IP from request
export function getClientIp(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
               req.headers['x-real-ip'] || 
               req.headers['cf-connecting-ip'] ||
               req.headers['fastly-client-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               req.connection?.socket?.remoteAddress ||
               '127.0.0.1';
    
    // Remove IPv6 prefix and port if present
    const cleanIp = ip
        .replace(/^::ffff:/, '')
        .replace(/:\d+$/, '')
        .trim();
    
    return cleanIp || '127.0.0.1';
}
