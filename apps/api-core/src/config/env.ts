export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://dvthao:123@localhost:5432/pos_master',
  jwtSecret: process.env.JWT_SECRET ?? 'pos-master-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
