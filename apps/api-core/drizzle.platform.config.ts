import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://dvthao:123@localhost:5432/pos_master',
  },
  schemaFilter: ['platform'],
  out: './.drizzle/platform',
  introspect: {
    casing: 'camel',
  },
});
