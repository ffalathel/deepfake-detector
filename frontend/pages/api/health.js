/**
 * Health check endpoint for monitoring service status.
 * 
 * Provides comprehensive health information including frontend status,
 * backend connectivity, system metrics, and environment details.
 * Used for monitoring and debugging the application in production.
 * 
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 * @returns {Promise<void>} JSON response with health status and system information
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      // Check backend connectivity
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      let backendStatus = 'unknown';
      
      try {
        const response = await fetch(`${backendUrl}/health`, {
          method: 'GET',
          timeout: 5000,
        });
        backendStatus = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        backendStatus = 'unreachable';
      }
  
      const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          frontend: 'healthy',
          backend: backendStatus,
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        }
      };
  
      res.status(200).json(healthInfo);
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }