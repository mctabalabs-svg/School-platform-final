import { AsyncLocalStorage } from 'node:async_hooks';
import { PGlite } from '@electric-sql/pglite';
import { Pool, PoolClient } from 'pg';
import { NextFunction, Request, Response } from 'express';

type QueryResult = { rows: any[]; rowCount?: number | null };
type Queryable = {
  query: <T = any>(sql: string, params?: any[]) => Promise<QueryResult & { rows: T[] }>;
};
type RequestDatabaseContext = { client: PoolClient; schema: string; inTransaction?: boolean };

const requestDatabaseContext = new AsyncLocalStorage<RequestDatabaseContext>();
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured in production.');
}
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    })
  : null;
const localDatabase = pool ? null : new PGlite();
let transactionId = 0;

function quoteSchema(schema: string) {
  if (!/^public$|^school_[a-f0-9]{32}$/.test(schema)) {
    throw new Error('Invalid database schema name.');
  }
  return `"${schema}"`;
}

export const isExternalDatabaseEnabled = Boolean(pool);

export const database = {
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult & { rows: T[] }> {
    if (!pool) {
      return localDatabase!.query<T>(sql, params) as Promise<QueryResult & { rows: T[] }>;
    }

    const context = requestDatabaseContext.getStore();
    return (context ? context.client.query(sql, params) : pool.query(sql, params)) as Promise<
      QueryResult & { rows: T[] }
    >;
  },

  async transaction<T>(callback: (tx: Queryable) => Promise<T>): Promise<T> {
    if (!pool) {
      return localDatabase!.transaction(callback as any) as Promise<T>;
    }

    const context = requestDatabaseContext.getStore();
    const client = context?.client ?? (await pool.connect());
    const savepoint = `school_platform_sp_${++transactionId}`;
    const needsSavepoint = Boolean(context?.inTransaction);

    try {
      if (needsSavepoint) {
        await client.query(`SAVEPOINT ${savepoint}`);
      } else {
        await client.query('BEGIN');
        if (!context) await client.query('SET LOCAL search_path TO "public"');
        else context.inTransaction = true;
      }

      const result = await requestDatabaseContext.run(
        context ?? { client, schema: 'public' },
        () => callback({ query: (sql, params) => client.query(sql, params) })
      );

      if (needsSavepoint) {
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } else {
        await client.query('COMMIT');
      }
      return result;
    } catch (error) {
      if (needsSavepoint) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`).catch(() => undefined);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => undefined);
      } else {
        await client.query('ROLLBACK').catch(() => undefined);
      }
      throw error;
    } finally {
      if (!needsSavepoint && context) context.inTransaction = false;
      if (!context) client.release();
    }
  },
};

export async function withDatabaseSchema<T>(schema: string, callback: () => Promise<T>): Promise<T> {
  if (!pool) {
    if (schema !== 'public') throw new Error('Multi-school provisioning requires DATABASE_URL.');
    return callback();
  }

  const quotedSchema = quoteSchema(schema);
  const context = requestDatabaseContext.getStore();
  if (context) {
    await context.client.query(`SET search_path TO ${quotedSchema}`);
    try {
      return await requestDatabaseContext.run(
        { client: context.client, schema, inTransaction: context.inTransaction },
        callback
      );
    } finally {
      await context.client.query(`SET search_path TO ${quoteSchema(context.schema)}`);
    }
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${quotedSchema}`);
    return await requestDatabaseContext.run({ client, schema }, callback);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.query('RESET search_path').catch(() => undefined);
    client.release();
  }
}

export function schoolDatabaseScope(req: Request, res: Response, next: NextFunction) {
  if (!pool) return next();

  const user = (req as Request & { user?: { role?: string; school_id?: string } }).user;
  if (!user?.school_id) {
    return res.status(401).json({ error: 'An authenticated school session is required.' });
  }

  if (user.role === 'platform_admin' || user.school_id === 'SCH-KEN-2026-001') {
    return withRequestSchema('public', req, res, next);
  }

  pool
    .query<{ schema_name: string; status: string }>(
      'SELECT schema_name, status FROM schools WHERE id = $1 LIMIT 1;',
      [user.school_id]
    )
    .then(({ rows }) => {
      const school = rows[0];
      if (!school || school.status !== 'active') {
        return res.status(403).json({ error: 'School workspace is unavailable.' });
      }
      return withRequestSchema(school.schema_name, req, res, next);
    })
    .catch(next);
}

function withRequestSchema(schema: string, req: Request, res: Response, next: NextFunction) {
  const quotedSchema = quoteSchema(schema);
  pool!.connect().then((client) => {
    client
      .query(`SET search_path TO ${quotedSchema}`)
      .then(() => {
        let cleanedUp = false;
        const cleanup = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          void client
            .query('ROLLBACK')
            .catch(() => undefined)
            .then(() => client.query('RESET search_path').catch(() => undefined))
            .then(() => client.release())
            .catch((error) => client.release(error));
        };
        res.once('finish', cleanup);
        res.once('close', cleanup);
        requestDatabaseContext.run({ client, schema }, next);
      })
      .catch((error) => {
        client.release(error);
        next(error);
      });
  }).catch(next);
}
