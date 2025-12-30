const { generateToken } = require('../../lib/token');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];

  if (apiKey !== 'Toji') {
    return res.status(401).json({ success: false, error: 'Unauthorized. Only main key can generate tokens.' });
  }

  const { owner, limit = 1000, expiresIn = 604800 } = req.body; // expiresIn default 7 days in seconds

  if (!owner) {
    return res.status(400).json({ success: false, error: 'Owner name is required' });
  }

  // Generate token
  const token = generateToken(owner, limit, expiresIn);

  return res.json({
    success: true,
    token,
    owner,
    limit,
    expiresIn,
    note: 'Use this token as x-api-key in requests. It expires in ' + expiresIn + ' seconds.'
  });
};
