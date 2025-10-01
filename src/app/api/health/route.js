// app/api/health/route.js

/**
 * Health check endpoint for monitoring service status.
 * 
 * Returns the current status of the frontend service and basic system information.
 * This endpoint is used by monitoring systems to verify the service is running.
 * 
 * @returns {Promise<Response>} JSON response with service health status
 */
export async function GET() {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    return Response.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      error: error.message
    }, { status: 500 });
  }
}
