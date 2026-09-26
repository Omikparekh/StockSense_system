import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { AppError } from '../../middleware/errorHandler.js';
import { db } from '../../config/database.js';
import { getNextSequence } from '../../core/sequence.js';

const historyRouter = Router();

const createAdjustmentSchema = z.object({
  product_id: z.number().int().positive({ message: 'Valid product ID is required' }),
  location_id: z.number().int().positive().optional(),
  counted_quantity: z.number().min(0, { message: 'Physical counted quantity cannot be negative' }),
  reason: z.string().min(3, { message: 'Reason must be at least 3 characters (e.g. Physical inventory cycle count)' })
});

export interface StockHistoryItem {
  id: number;
  reference: string;
  operation_type: 'IN' | 'OUT' | 'INT' | 'ADJ';
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  uom: string;
  from_location: string;
  to_location: string;
  quantity: number;
  status: string;
  user_name: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * GET /api/v1/stock-history
 * Query immutable audit ledger of all inventory movements.
 * Supports filtering by operation_type (IN, OUT, INT, ADJ), search, date range, product_id, pagination.
 */
historyRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;

    const operationType = req.query.operation_type ? String(req.query.operation_type).trim().toUpperCase() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const productId = req.query.product_id ? Number(req.query.product_id) : null;
    const fromDate = req.query.from_date ? String(req.query.from_date).trim() : null;
    const toDate = req.query.to_date ? String(req.query.to_date).trim() : null;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (operationType && ['IN', 'OUT', 'INT', 'ADJ'].includes(operationType)) {
      conditions.push(`h.operation_type = $${pIdx++}`);
      params.push(operationType);
    }

    if (productId && !isNaN(productId)) {
      conditions.push(`h.product_id = $${pIdx++}`);
      params.push(productId);
    }

    if (fromDate) {
      conditions.push(`DATE(h.created_at) >= DATE($${pIdx++})`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`DATE(h.created_at) <= DATE($${pIdx++})`);
      params.push(toDate);
    }

    if (search) {
      conditions.push(`(
        h.reference LIKE $${pIdx} OR 
        p.name LIKE $${pIdx} OR 
        p.sku LIKE $${pIdx} OR 
        h.from_location LIKE $${pIdx} OR 
        h.to_location LIKE $${pIdx} OR 
        h.notes LIKE $${pIdx} OR
        h.user_name LIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ${whereClause}
    `;
    const countRow = await db.queryOne<{ total: number }>(countSql, params);
    const total = Number(countRow?.total) || 0;

    // Paginated list query
    const listSql = `
      SELECT 
        h.id,
        h.reference,
        h.operation_type,
        h.product_id,
        COALESCE(p.name, 'Deleted Product') AS product_name,
        COALESCE(p.sku, 'N/A') AS sku,
        COALESCE(p.category, 'General') AS category,
        COALESCE(p.uom, 'Units') AS uom,
        h.from_location,
        h.to_location,
        h.quantity,
        h.status,
        h.user_name,
        h.notes,
        h.created_at
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ${whereClause}
      ORDER BY h.id DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const items = await db.query<StockHistoryItem>(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * GET /api/v1/stock-history/adjustments
 * Dedicated list of physical stock adjustments (WH/ADJ/...)
 */
historyRouter.get(
  '/adjustments',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : null;
    const fromDate = req.query.from_date ? String(req.query.from_date).trim() : null;
    const toDate = req.query.to_date ? String(req.query.to_date).trim() : null;

    const conditions: string[] = ["h.operation_type = 'ADJ'"];
    const params: any[] = [];
    let pIdx = 1;

    if (fromDate) {
      conditions.push(`DATE(h.created_at) >= DATE($${pIdx++})`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`DATE(h.created_at) <= DATE($${pIdx++})`);
      params.push(toDate);
    }

    if (search) {
      conditions.push(`(
        h.reference LIKE $${pIdx} OR 
        p.name LIKE $${pIdx} OR 
        p.sku LIKE $${pIdx} OR 
        h.from_location LIKE $${pIdx} OR 
        h.to_location LIKE $${pIdx} OR 
        h.notes LIKE $${pIdx} OR
        h.user_name LIKE $${pIdx}
      )`);
      params.push(`%${search}%`);
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ${whereClause}
    `;
    const countRow = await db.queryOne<{ total: number }>(countSql, params);
    const total = Number(countRow?.total) || 0;

    const listSql = `
      SELECT 
        h.id,
        h.reference,
        h.operation_type,
        h.product_id,
        COALESCE(p.name, 'Deleted Product') AS product_name,
        COALESCE(p.sku, 'N/A') AS sku,
        COALESCE(p.category, 'General') AS category,
        COALESCE(p.uom, 'Units') AS uom,
        h.from_location,
        h.to_location,
        h.quantity,
        h.status,
        h.user_name,
        h.notes,
        h.created_at
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ${whereClause}
      ORDER BY h.id DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const items = await db.query<StockHistoryItem>(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * POST /api/v1/stock-history/adjustments
 * Perform a physical inventory audit adjustment from the Adjustments view.
 */
historyRouter.post(
  '/adjustments',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createAdjustmentSchema.parse(req.body);

    const product = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [parsed.product_id]);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Resolve target location
    let targetLocId = parsed.location_id;
    let targetLoc: { id: number; path: string; warehouse_id: number; short_code: string } | null = null;

    if (targetLocId) {
      targetLoc = await db.queryOne<any>(
        'SELECT id, path, warehouse_id, short_code FROM locations WHERE id = $1',
        [targetLocId]
      );
      if (!targetLoc) {
        throw new AppError('Target location not found', 404);
      }
    } else {
      // Default to WH/Stock or primary location
      targetLoc = await db.queryOne<any>(
        "SELECT id, path, warehouse_id, short_code FROM locations WHERE path = 'WH/Stock' LIMIT 1"
      );
      if (!targetLoc) {
        targetLoc = await db.queryOne<any>(
          'SELECT id, path, warehouse_id, short_code FROM locations ORDER BY id ASC LIMIT 1'
        );
      }
      if (!targetLoc) {
        throw new AppError('No storage location available for adjustment', 400);
      }
      targetLocId = targetLoc.id;
    }

    // Fetch warehouse short code for sequence generation
    const warehouse = await db.queryOne<{ short_code: string }>(
      'SELECT short_code FROM warehouses WHERE id = $1',
      [targetLoc.warehouse_id]
    );
    const whCode = warehouse?.short_code || 'WH';

    // Retrieve current stock level
    const existingStock = await db.queryOne<{ id: number; on_hand: number; reserved: number }>(
      'SELECT id, on_hand, reserved FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [parsed.product_id, targetLocId]
    );

    const currentOnHand = existingStock ? Number(existingStock.on_hand) : 0;
    const delta = parsed.counted_quantity - currentOnHand;

    if (delta === 0) {
      res.json({
        success: true,
        message: `Stock level for "${product.name}" at ${targetLoc.path} is already accurate (${currentOnHand} ${product.uom}). No change required.`,
        data: {
          reference: 'N/A',
          productId: parsed.product_id,
          productName: product.name,
          locationId: targetLocId,
          locationPath: targetLoc.path,
          previousQuantity: currentOnHand,
          countedQuantity: parsed.counted_quantity,
          delta: 0,
          uom: product.uom,
          reason: parsed.reason
        }
      });
      return;
    }

    // Atomically update stock level
    if (existingStock) {
      await db.execute(
        'UPDATE stock_levels SET on_hand = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [parsed.counted_quantity, existingStock.id]
      );
    } else {
      await db.execute(
        'INSERT INTO stock_levels (product_id, location_id, on_hand, reserved) VALUES ($1, $2, $3, 0)',
        [parsed.product_id, targetLocId, parsed.counted_quantity]
      );
    }

    // Generate ERP sequence reference (WH/ADJ/00001)
    const sequenceRef = await getNextSequence(whCode, 'ADJ');

    let fromLocation: string;
    let toLocation: string;

    if (delta > 0) {
      fromLocation = 'Virtual/Adjustment (Inventory Gain)';
      toLocation = targetLoc.path;
    } else {
      fromLocation = targetLoc.path;
      toLocation = 'Virtual/Adjustment (Inventory Loss/Damage)';
    }

    const auditNotes = `Audit Adjustment: Counted ${parsed.counted_quantity} ${product.uom} (recorded ${currentOnHand}, delta ${delta >= 0 ? '+' : ''}${delta}). Reason: ${parsed.reason}`;

    await db.execute(
      `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sequenceRef,
        'ADJ',
        parsed.product_id,
        fromLocation,
        toLocation,
        Math.abs(delta),
        'Done',
        req.user?.loginId || 'Staff',
        auditNotes
      ]
    );

    res.status(201).json({
      success: true,
      message: `Stock successfully adjusted for "${product.name}".`,
      data: {
        reference: sequenceRef,
        productId: parsed.product_id,
        productName: product.name,
        locationId: targetLocId,
        locationPath: targetLoc.path,
        previousQuantity: currentOnHand,
        countedQuantity: parsed.counted_quantity,
        delta,
        uom: product.uom,
        reason: parsed.reason
      }
    });
  })
);

/**
 * GET /api/v1/stock-history/export/csv
 * Export full stock move history ledger to CSV format.
 */
historyRouter.get(
  '/export/csv',
  authMiddleware,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await db.query<any>(`
      SELECT 
        h.id,
        h.reference,
        h.operation_type,
        h.created_at,
        p.name AS product_name,
        p.sku,
        p.uom,
        h.quantity,
        h.from_location,
        h.to_location,
        h.status,
        h.user_name,
        h.notes
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ORDER BY h.id DESC
      LIMIT 1000
    `);

    const headers = [
      'ID',
      'Reference',
      'Operation Type',
      'Date & Time (UTC)',
      'Product Name',
      'SKU',
      'Quantity',
      'UoM',
      'From Location',
      'To Location',
      'Status',
      'User / Operator',
      'Audit Notes'
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      csvLines.push(
        [
          r.id,
          escapeCsv(r.reference),
          escapeCsv(r.operation_type),
          escapeCsv(r.created_at),
          escapeCsv(r.product_name),
          escapeCsv(r.sku),
          r.quantity,
          escapeCsv(r.uom),
          escapeCsv(r.from_location),
          escapeCsv(r.to_location),
          escapeCsv(r.status),
          escapeCsv(r.user_name),
          escapeCsv(r.notes)
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="stocksense-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvLines.join('\n'));
  })
);

export { historyRouter };
