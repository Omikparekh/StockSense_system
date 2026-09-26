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
      );`,

      // Sequence numbering table (ERP-standard sequence tracking: WH/IN/00001, WH/OUT/00001, etc.)
      `CREATE TABLE IF NOT EXISTS sequences (
        id ${autoInc},
        warehouse_code VARCHAR(20) NOT NULL,
        operation_type VARCHAR(10) NOT NULL,
        last_number INTEGER NOT NULL DEFAULT 0,
        UNIQUE(warehouse_code, operation_type)
      );`,

      // Operations table (Receipts WH/IN, Deliveries WH/OUT, Transfers WH/INT, Adjustments WH/ADJ)
      `CREATE TABLE IF NOT EXISTS operations (
        id ${autoInc},
        reference VARCHAR(100) UNIQUE NOT NULL,
        operation_type VARCHAR(10) NOT NULL,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        partner_name VARCHAR(255),
        source_location_id INTEGER REFERENCES locations(id),
        destination_location_id INTEGER REFERENCES locations(id),
        scheduled_date VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        notes TEXT,
        created_by_user VARCHAR(255),
        created_at ${timestampDefault},
        validated_at ${timestampDefault}
      );`,

      // Line items for operations
      `CREATE TABLE IF NOT EXISTS operation_items (
        id ${autoInc},
        operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        demand_qty NUMERIC(12, 2) NOT NULL,
        done_qty NUMERIC(12, 2) NOT NULL DEFAULT 0,
        created_at ${timestampDefault}
      );`,

      // Partners / Suppliers / Vendors table
      `CREATE TABLE IF NOT EXISTS partners (
        id ${autoInc},
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'supplier',
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        address TEXT,
        tax_id VARCHAR(100),
        payment_terms VARCHAR(100) DEFAULT 'Net 30',
        notes TEXT,
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

      // Check and seed demo products
      const existingProd = await this.queryOne('SELECT id FROM products LIMIT 1');
      if (!existingProd) {
        const stockLoc = await this.queryOne("SELECT id FROM locations WHERE path = 'WH/Stock'");
        const stockLocId = stockLoc ? stockLoc.id : 1;

        const demoProducts = [
          { name: 'Steel Rods', sku: 'STL-ROD-01', category: 'Raw Materials', uom: 'kg', weight: 100.0, reorder: 15.0, onHand: 50.0 },
          { name: 'Office Chairs', sku: 'CHR-OFF-02', category: 'Furniture', uom: 'Units', weight: 15.0, reorder: 20.0, onHand: 70.0 },
          { name: 'Industrial Bolts', sku: 'BLT-IND-03', category: 'Hardware', uom: 'Units', weight: 0.2, reorder: 200.0, onHand: 1200.0 },
          { name: 'Aluminum Sheets', sku: 'ALM-SHT-04', category: 'Raw Materials', uom: 'kg', weight: 25.0, reorder: 10.0, onHand: 8.0 },
          { name: 'Electric Motors', sku: 'MTR-ELC-06', category: 'Machinery', uom: 'Units', weight: 35.0, reorder: 5.0, onHand: 0.0 },
          { name: 'Packaging Boxes', sku: 'BOX-PKG-07', category: 'Packaging', uom: 'Boxes', weight: 0.5, reorder: 50.0, onHand: 350.0 },
        ];

        for (const p of demoProducts) {
          const prodRes = await this.execute(
            `INSERT INTO products (name, sku, category, uom, per_unit_weight, reorder_level)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [p.name, p.sku, p.category, p.uom, p.weight, p.reorder]
          );
          const prodId = prodRes.lastInsertRowid;
          if (prodId) {
            await this.execute(
              `INSERT INTO stock_levels (product_id, location_id, on_hand, reserved)
               VALUES ($1, $2, $3, 0)`,
              [prodId, stockLocId, p.onHand]
            );
          }
        }
        console.log('[Database] Seeded 6 realistic demo products with initial stock balances.');
      }

      // Check and seed demo operations
      const existingOp = await this.queryOne('SELECT id FROM operations LIMIT 1');
      if (!existingOp) {
        const wh = await this.queryOne<{ id: number }>('SELECT id FROM warehouses WHERE short_code = $1', ['WH']);
        const whId = wh ? wh.id : 1;
        const stockLoc = await this.queryOne<{ id: number }>("SELECT id FROM locations WHERE path = 'WH/Stock'");
        const stockLocId = stockLoc ? stockLoc.id : 1;
        const outputLoc = await this.queryOne<{ id: number }>("SELECT id FROM locations WHERE path = 'WH/Output'");
        const outputLocId = outputLoc ? outputLoc.id : 2;

        const prod1 = await this.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'STL-ROD-01'");
        const prod2 = await this.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'BLT-IND-03'");
        const prod3 = await this.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'MTR-ELC-06'");
        const prod4 = await this.queryOne<{ id: number }>("SELECT id FROM products WHERE sku = 'BOX-PKG-07'");

        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

        // 1. Inbound Receipt WH/IN/00001 (Ready)
        const op1 = await this.execute(
          `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, destination_location_id, scheduled_date, status, notes, created_by_user)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          ['WH/IN/00001', 'IN', whId, 'Tata Steel Suppliers', stockLocId, todayStr, 'Ready', 'Primary raw material delivery for Q3 production', 'admin']
        );
        if (op1.lastInsertRowid && prod1) {
          await this.execute(
            `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
            [op1.lastInsertRowid, prod1.id, 25.0, 25.0]
          );
        }

        // 2. Inbound Receipt WH/IN/00002 (Done)
        const op2 = await this.execute(
          `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, destination_location_id, scheduled_date, status, notes, created_by_user, validated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
          ['WH/IN/00002', 'IN', whId, 'Fastener World Logistics', stockLocId, yesterday, 'Done', 'Expedited bolt shipment received and counted', 'admin']
        );
        if (op2.lastInsertRowid && prod2) {
          await this.execute(
            `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
            [op2.lastInsertRowid, prod2.id, 500.0, 500.0]
          );
        }

        // 3. Outbound Delivery WH/OUT/00001 (Ready)
        const op3 = await this.execute(
          `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, source_location_id, destination_location_id, scheduled_date, status, notes, created_by_user)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          ['WH/OUT/00001', 'OUT', whId, 'Apex Construction Corp', stockLocId, outputLocId, todayStr, 'Ready', 'Scheduled dispatch batch A', 'admin']
        );
        if (op3.lastInsertRowid && prod1) {
          await this.execute(
            `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
            [op3.lastInsertRowid, prod1.id, 10.0, 0.0]
          );
        }

        // 4. Outbound Delivery WH/OUT/00002 (Waiting - insufficient stock)
        const op4 = await this.execute(
          `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, source_location_id, destination_location_id, scheduled_date, status, notes, created_by_user)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          ['WH/OUT/00002', 'OUT', whId, 'Metro Machinery Works', stockLocId, outputLocId, tomorrow, 'Waiting', 'Waiting for electric motor replenishment', 'admin']
        );
        if (op4.lastInsertRowid && prod3) {
          await this.execute(
            `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
            [op4.lastInsertRowid, prod3.id, 5.0, 0.0]
          );
        }

        // 5. Internal Transfer WH/INT/00001 (Draft)
        const op5 = await this.execute(
          `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, source_location_id, destination_location_id, scheduled_date, status, notes, created_by_user)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          ['WH/INT/00001', 'INT', whId, 'Internal Dispatch Dept', stockLocId, outputLocId, todayStr, 'Draft', 'Transfer to packing station', 'admin']
        );
        if (op5.lastInsertRowid && prod4) {
          await this.execute(
            `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
            [op5.lastInsertRowid, prod4.id, 50.0, 0.0]
          );
        }

        // Update sequences
        await this.execute(
          `INSERT INTO sequences (warehouse_code, operation_type, last_number) VALUES ($1, $2, $3)`,
          ['WH', 'IN', 2]
        );
        await this.execute(
          `INSERT INTO sequences (warehouse_code, operation_type, last_number) VALUES ($1, $2, $3)`,
          ['WH', 'OUT', 2]
        );
        await this.execute(
          `INSERT INTO sequences (warehouse_code, operation_type, last_number) VALUES ($1, $2, $3)`,
          ['WH', 'INT', 1]
        );

        console.log('[Database] Seeded demo operations (WH/IN/00001-2, WH/OUT/00001-2, WH/INT/00001) and sequences.');
      }

      // Seed initial suppliers if none exist
      try {
        const existingPartners = await this.queryOne('SELECT COUNT(*) as count FROM partners');
        const partnerCount = Number((existingPartners as any)?.count) || 0;
        if (partnerCount === 0) {
          await this.execute(
            `INSERT INTO partners (name, type, contact_name, email, phone, address, tax_id, payment_terms, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            ['Global Logistics Supplies', 'supplier', 'Marcus Vance', 'marcus@globallogistics.io', '+1 (555) 234-5678', '1200 Industrial Pkwy, Chicago, IL 60601', 'US-TAX-88902', 'Net 30', 'Primary vendor for raw steel and metallic raw materials']
          );
          await this.execute(
            `INSERT INTO partners (name, type, contact_name, email, phone, address, tax_id, payment_terms, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            ['Apex Hardware Corp', 'supplier', 'Sarah Chen', 'sarah@apexhardware.com', '+1 (555) 876-5432', '450 Metalworks Blvd, Cleveland, OH 44114', 'US-TAX-44109', 'Net 15', 'Precision fastener and bolt components distributor']
          );
          await this.execute(
            `INSERT INTO partners (name, type, contact_name, email, phone, address, tax_id, payment_terms, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            ['Starlight Packaging Ltd', 'supplier', 'David Miller', 'orders@starlightpackaging.com', '+1 (555) 345-6789', '88 Box Lane, Dallas, TX 75201', 'US-TAX-10293', 'Net 30', 'High durability cartons, packaging films and shipping boxes']
          );
          await this.execute(
            `INSERT INTO partners (name, type, contact_name, email, phone, address, tax_id, payment_terms, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            ['Acme Industrial Supplies', 'supplier', 'Robert King', 'robert@acmeindustrial.com', '+1 (555) 901-2345', '77 Chemistry Way, Houston, TX 77001', 'US-TAX-66512', 'Due on Receipt', 'Industrial lubricants, seals and chemicals']
          );
          console.log('[Database] Seeded default suppliers into partners table.');
        }
      } catch (pErr) {
        console.warn('[Database] Partners table seed notice:', pErr);
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
