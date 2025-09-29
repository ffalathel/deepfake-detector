// pages/api/health.js
export default function handler(req, res) {
  // Simple health check endpoint
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'frontend',
    version: '1.0.0'
  });
}