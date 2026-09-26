import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { env } from './env.js';

export type DatabaseEngine = 'sqlite' | 'postgresql';

class DatabaseClient {
  private sqliteDb: Database.Database | null = null;
  private pgPool: pg.Pool | null = null;
  public engine: DatabaseEngine = 'sqlite';

  constructor() {
    if (env.DATABASE_URL.startsWith('postgres://') || env.DATABASE_URL.startsWith('postgresql://')) {
      this.engine = 'postgresql';
      this.pgPool = new pg.Pool({ connectionString: env.DATABASE_URL });
    } else {
      this.engine = 'sqlite';
      let dbPath = env.DATABASE_URL.replace('sqlite:///', '').replace('sqlite://', '');
      if (dbPath.startsWith('./')) {
        dbPath = path.resolve(process.cwd(), dbPath);
      }
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.sqliteDb = new Database(dbPath);
      this.sqliteDb.pragma('journal_mode = WAL');
      this.sqliteDb.pragma('foreign_keys = ON');
      this.sqliteDb.pragma('busy_timeout = 5000');
    }
  }

  private formatSqlite(sql: string, params: any[]): { sql: string; params: any[] } {
    const mappedParams: any[] = [];
    const sqliteSql = sql.replace(/\$(\d+)/g, (_, idx) => {
      const paramIndex = parseInt(idx, 10) - 1;
      mappedParams.push(params[paramIndex]);
      return '?';
    });
    return { sql: sqliteSql, params: mappedParams };
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.engine === 'sqlite' && this.sqliteDb) {
      const { sql: sqliteSql, params: mappedParams } = this.formatSqlite(sql, params);
      const stmt = this.sqliteDb.prepare(sqliteSql);
      if (sqliteSql.trim().toUpperCase().startsWith('SELECT') || sqliteSql.includes('RETURNING')) {
        return stmt.all(...mappedParams) as T[];
      } else {
        const info = stmt.run(...mappedParams);
        return [{ changes: info.changes, lastInsertRowid: info.lastInsertRowid }] as any;
      }
    } else if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return res.rows as T[];
    }
    return [];
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async execute(sql: string, params: any[] = []): Promise<any> {
    if (this.engine === 'sqlite' && this.sqliteDb) {
      const { sql: sqliteSql, params: mappedParams } = this.formatSqlite(sql, params);
      return this.sqliteDb.prepare(sqliteSql).run(...mappedParams);
    } else if (this.pgPool) {
      return await this.pgPool.query(sql, params);
    }
  }

  public async ping(): Promise<boolean> {
    try {
      if (this.engine === 'sqlite' && this.sqliteDb) {
        this.sqliteDb.prepare('SELECT 1').get();
        return true;
      } else if (this.pgPool) {
        await this.pgPool.query('SELECT 1');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async initSchema(): Promise<void> {
    const isSqlite = this.engine === 'sqlite';
    const autoInc = isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY';
    const timestampDefault = isSqlite ? "DATETIME DEFAULT (datetime('now', 'utc'))" : "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP";

    const schemaStatements = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id ${autoInc},
        login_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'warehouse_staff',
        is_active BOOLEAN DEFAULT TRUE,
        created_at ${timestampDefault},
        updated_at ${timestampDefault}
      );`,

      // Warehouses table
      `CREATE TABLE IF NOT EXISTS warehouses (
        id ${autoInc},
        name VARCHAR(255) NOT NULL,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        address TEXT,
        created_at ${timestampDefault}
      );`,

      // Locations table (under warehouse)
      `CREATE TABLE IF NOT EXISTS locations (
        id ${autoInc},
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        short_code VARCHAR(50) NOT NULL,
        path VARCHAR(100) UNIQUE NOT NULL,
        created_at ${timestampDefault}
      );`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
        id ${autoInc},
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        uom VARCHAR(50) NOT NULL DEFAULT 'Units',
        per_unit_weight NUMERIC(10, 2) DEFAULT 0,
        reorder_level NUMERIC(10, 2) DEFAULT 10,
        created_at ${timestampDefault}
      );`,

      // Stock Inventory by location
      `CREATE TABLE IF NOT EXISTS stock_levels (
        id ${autoInc},
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0,
        reserved NUMERIC(12, 2) NOT NULL DEFAULT 0,
        updated_at ${timestampDefault},
        UNIQUE(product_id, location_id)
      );`,

      // Stock Move History (Audit Ledger)
      `CREATE TABLE IF NOT EXISTS stock_history (
        id ${autoInc},
        reference VARCHAR(100) NOT NULL,
        operation_type VARCHAR(20) NOT NULL,
        product_id INTEGER NOT NULL REFERENCES products(id),
        from_location VARCHAR(255) NOT NULL,
        to_location VARCHAR(255) NOT NULL,
        quantity NUMERIC(12, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        user_name VARCHAR(255),
        notes TEXT,
        created_at ${timestampDefault}
      );`,

      // OTP Verification Codes table
      `CREATE TABLE IF NOT EXISTS otps (
        id ${autoInc},
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        expires_at ${timestampDefault},
        used BOOLEAN DEFAULT FALSE,
        created_at ${timestampDefault}
      );`
    ];

    for (const statement of schemaStatements) {
      await this.execute(statement);
    }

    await this.seedInitialData();
  }

  private async seedInitialData(): Promise<void> {
    try {
      // Check if admin user exists by login_id or email
      const existingUser = await this.queryOne(
        'SELECT id FROM users WHERE login_id = $1 OR email = $2',
        ['admin', 'admin@stocksense.io']
      );
      if (!existingUser) {
        const { hashPassword } = await import('../core/security.js');
        const defaultHash = await hashPassword('AdminPassword123!');
        await this.execute(
          `INSERT INTO users (login_id, email, name, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['admin', 'admin@stocksense.io', 'Administrator', defaultHash, 'admin', 1]
        );
        console.log('[Database] Seeded initial admin user (admin / AdminPassword123!)');
      }

      // Check if default warehouse exists
      const existingWh = await this.queryOne('SELECT id FROM warehouses WHERE short_code = $1', ['WH']);
      if (!existingWh) {
        const whRes = await this.execute(
          `INSERT INTO warehouses (name, short_code, address) VALUES ($1, $2, $3)`,
          ['Main Warehouse', 'WH', 'Building 4, Industrial Logistics Zone']
        );
        const whId = whRes.lastInsertRowid || 1;

        // Check and create default locations under WH
        const existingStock = await this.queryOne('SELECT id FROM locations WHERE path = $1', ['WH/Stock']);
        if (!existingStock) {
          await this.execute(
            `INSERT INTO locations (warehouse_id, name, short_code, path) VALUES ($1, $2, $3, $4)`,
            [whId, 'Central Stock', 'Stock', 'WH/Stock']
          );
        }
        const existingOutput = await this.queryOne('SELECT id FROM locations WHERE path = $1', ['WH/Output']);
        if (!existingOutput) {
          await this.execute(
            `INSERT INTO locations (warehouse_id, name, short_code, path) VALUES ($1, $2, $3, $4)`,
            [whId, 'Dispatch Output', 'Output', 'WH/Output']
          );
        }
        console.log('[Database] Seeded default warehouse (WH) and locations (WH/Stock, WH/Output)');
      }
    } catch (err) {
      console.warn('[Database] Seeding notice:', err);
    }
  }

  public close(): void {
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
    if (this.pgPool) {
      this.pgPool.end();
    }
  }
}

export const db = new DatabaseClient();
