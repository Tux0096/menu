import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pathEnv = resolve(__dirname, '.env');

dotenv.config({ path: pathEnv });

// Секреты берутся только из .env; если не заданы — временные случайные (токены сбросятся при рестарте)
const env = {
    API_SERVER_HOST: process.env.API_SERVER_HOST || '0.0.0.0',
    API_SERVER_PORT: process.env.API_SERVER_PORT || 3001,
    API_JWT_SECRET_KEY: process.env.API_JWT_SECRET_KEY || randomBytes(32).toString('hex'),
    API_COURIER_SECRET_KEY: process.env.API_COURIER_SECRET_KEY || randomBytes(32).toString('hex'),
    ...process.env
};

export default env;
