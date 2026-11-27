
import sql from 'mssql/msnodesqlv8';
import { env } from '../config/env.ts';

const config: sql.config = {
  server: env.db.server,
  port: env.db.port,
  database: env.db.database,

  driver: 'ODBC Driver 18 for SQL Server',

  options: {
    trustedConnection: true,
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30_000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((error: unknown) => {
        poolPromise = null;
        throw error;
      });
  }

  return poolPromise;
}

export async function closePool(): Promise<void> {
  if (!poolPromise) return;

  const pool = await poolPromise;
  await pool.close();
  poolPromise = null;
}
