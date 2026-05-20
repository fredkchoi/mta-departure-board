import { config as loadEnv } from 'dotenv';
loadEnv();

export const config = {
  port: parseInt(process.env.PORT ?? '3000'),
};
