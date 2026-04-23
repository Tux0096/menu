import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pathEnv = resolve(__dirname, '.env');

dotenv.config({ path: pathEnv });

const env = {
    API_SERVER_HOST: process.env.API_SERVER_HOST || '0.0.0.0',
    API_SERVER_PORT: process.env.API_SERVER_PORT || 3001,
    API_JWT_SECRET_KEY: process.env.API_JWT_SECRET_KEY || 'dev_fuji_key',
    API_COURIER_SECRET_KEY: process.env.API_COURIER_SECRET_KEY || 'courier_fuji_key',
    ...process.env
};

export default env;
