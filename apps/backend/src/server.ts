import { app } from './app';
import { config } from './config/env';
import { checkDatabaseConnection } from './config/database';

async function bootstrap() {
  const server = app.listen(config.port, async () => {
    console.log(`=======================================================`);
    console.log(`🌿 Smart Wildlife Conservation API Backend Started`);
    console.log(`📡 URL: http://localhost:${config.port}`);
    console.log(`🩺 Health: http://localhost:${config.port}/api/health`);
    console.log(`⚡ Environment: ${config.nodeEnv}`);
    console.log(`=======================================================`);

    // Initial database connection check
    const dbStatus = await checkDatabaseConnection();
    console.log(`[Neon PostgreSQL Status]: ${dbStatus.status.toUpperCase()} - ${dbStatus.message || dbStatus.error || ''}`);
  });

  // Graceful shutdown
  const handleShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
