import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getNextSequence } from '../../core/sequence.js';

const transfersRouter = Router();

const transferItemSchema = z.object({
  product_id: z.number().int().positive('Product ID is required'),
  demand_qty: z.number().positive('Demand quantity must be greater than 0'),
  done_qty: z.number().min(0).optional().default(0)
});

const createTransferSchema = z
  .object({
    warehouse_id: z.number().int().positive().optional(),
    source_location_id: z.number().int().positive('Source location is required'),
    destination_location_id: z.number().int().positive('Destination location is required'),
    scheduled_date: z.string().min(1, 'Scheduled date is required'),
    notes: z.string().optional().default(''),
    items: z.array(transferItemSchema).min(1, 'Transfer must have at least one product line item')
  })
  .refine((data) => data.source_location_id !== data.destination_location_id, {
    message: 'Source and destination storage locations cannot be the same',
    path: ['destination_location_id']
  });

const validateTransferSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    done_qty: z.number().min(0)
  })).optional()
});

/**
 * GET /api/v1/transfers
 * List internal location transfers with status, route, and item metrics.
 */
transfersRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status ? String(req.query.status).trim() : 'all';
    const search = req.query.search ? String(req.query.search).trim() : '';
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : null;

    let query = `
      SELECT 
        op.id,
        op.reference,
        op.operation_type,
        op.warehouse_id,
        w.name AS warehouse_name,
        w.short_code AS warehouse_code,
        op.partner_name,
        op.source_location_id,
        src.path AS source_path,
        src.name AS source_name,
        op.destination_location_id,
        dest.path AS destination_path,
        dest.name AS destination_name,
        op.scheduled_date,
        op.status,
        op.notes,
        op.created_by_user,
        op.created_at,
        op.validated_at,
        COUNT(oi.id) AS total_items,
        COALESCE(SUM(oi.demand_qty), 0) AS total_demand,
        COALESCE(SUM(oi.done_qty), 0) AS total_done
      FROM operations op
      JOIN warehouses w ON op.warehouse_id = w.id
      LEFT JOIN locations src ON op.source_location_id = src.id
      LEFT JOIN locations dest ON op.destination_location_id = dest.id
      LEFT JOIN operation_items oi ON oi.operation_id = op.id
      WHERE op.operation_type = 'INT'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND op.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (warehouseId) {
      query += ` AND op.warehouse_id = $${paramIndex}`;
      params.push(warehouseId);
      paramIndex++;
    }

    if (search) {
      query += ` AND (LOWER(op.reference) LIKE $${paramIndex} OR LOWER(src.path) LIKE $${paramIndex} OR LOWER(dest.path) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += `
      GROUP BY op.id, op.reference, op.operation_type, op.warehouse_id, w.name, w.short_code,
               op.partner_name, op.source_location_id, src.path, src.name,
               op.destination_location_id, dest.path, dest.name,
               op.scheduled_date, op.status, op.notes, op.created_by_user, op.created_at, op.validated_at
      ORDER BY op.id DESC
    `;

    const rows = await db.query<any>(query, params);

    const transfers = rows.map((r) => ({
      id: Number(r.id),
      reference: r.reference,
      operation_type: r.operation_type,
      warehouse_id: Number(r.warehouse_id),
      warehouse_name: r.warehouse_name,
      warehouse_code: r.warehouse_code,
      partner_name: r.partner_name || 'Internal Warehouse Transfer',
      source_location_id: Number(r.source_location_id),
      source_path: r.source_path || 'WH/Stock',
      source_name: r.source_name || 'Central Stock',
      destination_location_id: Number(r.destination_location_id),
      destination_path: r.destination_path || 'WH/Output',
      destination_name: r.destination_name || 'Dispatch Output',
      scheduled_date: r.scheduled_date,
      status: r.status,
      notes: r.notes || '',
      created_by_user: r.created_by_user || 'admin',
      created_at: r.created_at,
      validated_at: r.validated_at,
      total_items: Number(r.total_items) || 0,
      total_demand: Number(r.total_demand) || 0,
      total_done: Number(r.total_done) || 0
    }));

    res.json({
      success: true,
      data: transfers
    });
  })
);

/**
 * GET /api/v1/transfers/:id
 * Retrieve single internal transfer details and line items.
 */
transfersRouter.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid transfer ID', 400);

    const transfer = await db.queryOne<any>(
      `SELECT 
        op.*,
        w.name AS warehouse_name,
        w.short_code AS warehouse_code,
        src.path AS source_path,
        src.name AS source_name,
        dest.path AS destination_path,
        dest.name AS destination_name
       FROM operations op
       JOIN warehouses w ON op.warehouse_id = w.id
       LEFT JOIN locations src ON op.source_location_id = src.id
       LEFT JOIN locations dest ON op.destination_location_id = dest.id
       WHERE op.id = $1 AND op.operation_type = 'INT'`,
      [id]
    );

    if (!transfer) throw new AppError('Internal transfer not found', 404);

    const items = await db.query<any>(
      `SELECT 
        oi.id,
        oi.operation_id,
        oi.product_id,
        oi.demand_qty,
        oi.done_qty,
        p.name AS product_name,
        p.sku AS product_sku,
        p.category AS product_category,
        p.uom AS product_uom,
        p.per_unit_weight,
        COALESCE(sl.on_hand, 0) AS source_on_hand
       FROM operation_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.location_id = $2
       WHERE oi.operation_id = $1
       ORDER BY oi.id ASC`,
      [id, transfer.source_location_id]
    );

    res.json({
      success: true,
      data: {
        transfer: {
          ...transfer,
          id: Number(transfer.id),
          warehouse_id: Number(transfer.warehouse_id),
          source_location_id: Number(transfer.source_location_id),
          destination_location_id: Number(transfer.destination_location_id)
        },
        items: items.map((i) => ({
          id: Number(i.id),
          operation_id: Number(i.operation_id),
          product_id: Number(i.product_id),
          product_name: i.product_name,
          product_sku: i.product_sku,
          product_category: i.product_category,
          product_uom: i.product_uom,
          per_unit_weight: Number(i.per_unit_weight) || 0,
          demand_qty: Number(i.demand_qty),
          done_qty: Number(i.done_qty),
          source_on_hand: Number(i.source_on_hand)
        }))
      }
    });
  })
);

/**
 * POST /api/v1/transfers
 * Create a new internal transfer (WH/INT/0000X) in Draft status.
 */
transfersRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createTransferSchema.parse(req.body);

    const srcLoc = await db.queryOne<{ id: number; warehouse_id: number; path: string }>(
      'SELECT id, warehouse_id, path FROM locations WHERE id = $1',
      [parsed.source_location_id]
    );
    if (!srcLoc) throw new AppError('Source storage location not found', 404);

    const destLoc = await db.queryOne<{ id: number; path: string }>(
      'SELECT id, path FROM locations WHERE id = $1',
      [parsed.destination_location_id]
    );
    if (!destLoc) throw new AppError('Destination storage location not found', 404);

    const warehouseId = parsed.warehouse_id || srcLoc.warehouse_id;
    const wh = await db.queryOne<{ short_code: string }>('SELECT short_code FROM warehouses WHERE id = $1', [warehouseId]);
    const whCode = wh?.short_code || 'WH';

    const sequenceRef = await getNextSequence(whCode, 'INT');

    const opRes = await db.execute(
      `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, source_location_id, destination_location_id, scheduled_date, status, notes, created_by_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sequenceRef,
        'INT',
        warehouseId,
        'Internal Relocation',
        srcLoc.id,
        destLoc.id,
        parsed.scheduled_date,
        'Draft',
        parsed.notes?.trim() || '',
        req.user?.loginId || 'staff'
      ]
    );

    const operationId = opRes.lastInsertRowid;

    for (const item of parsed.items) {
      await db.execute(
        `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty)
         VALUES ($1, $2, $3, $4)`,
        [operationId, item.product_id, item.demand_qty, item.done_qty || 0]
      );
    }

    res.status(201).json({
      success: true,
      message: `Internal Transfer ${sequenceRef} created in Draft status.`,
      data: {
        id: operationId,
        reference: sequenceRef,
        status: 'Draft'
      }
    });
  })
);

/**
 * POST /api/v1/transfers/:id/mark-ready
 * Transition transfer from Draft -> Ready.
 */
transfersRouter.post(
  '/:id/mark-ready',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid transfer ID', 400);

    const transfer = await db.queryOne<any>(
      'SELECT * FROM operations WHERE id = $1 AND operation_type = $2',
      [id, 'INT']
    );
    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status === 'Done') throw new AppError('Transfer is already completed.', 400);

    await db.execute("UPDATE operations SET status = 'Ready' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: `Transfer ${transfer.reference} marked Ready for movement execution.`
    });
  })
);

/**
 * POST /api/v1/transfers/:id/validate
 * ATOMIC INTERNAL MOVEMENT:
 * Deducts stock from source location, adds to destination location,
 * logs immutable audit ledger in stock_history, and marks operation Done.
 * Neutral net change on global company stock!
 */
transfersRouter.post(
  '/:id/validate',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid transfer ID', 400);

    const transfer = await db.queryOne<any>(
      `SELECT op.*, src.path AS source_path, dest.path AS destination_path 
       FROM operations op
       JOIN locations src ON op.source_location_id = src.id
       JOIN locations dest ON op.destination_location_id = dest.id
       WHERE op.id = $1 AND op.operation_type = 'INT'`,
      [id]
    );

    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status === 'Done') throw new AppError('This transfer has already been completed.', 400);

    const parsed = validateTransferSchema.parse(req.body);
    const existingItems = await db.query<any>('SELECT * FROM operation_items WHERE operation_id = $1', [id]);

    if (existingItems.length === 0) {
      throw new AppError('Cannot validate a transfer without line items.', 400);
    }

    const srcLocId = transfer.source_location_id;
    const destLocId = transfer.destination_location_id;

    // Verify source stock availability
    for (const item of existingItems) {
      let finalDoneQty = Number(item.demand_qty);
      if (parsed.items) {
        const matching = parsed.items.find(i => i.product_id === Number(item.product_id));
        if (matching !== undefined) finalDoneQty = Number(matching.done_qty);
      } else if (Number(item.done_qty) > 0) {
        finalDoneQty = Number(item.done_qty);
      }

      const stockRow = await db.queryOne<{ on_hand: number }>(
        'SELECT on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [item.product_id, srcLocId]
      );

      const available = Number(stockRow?.on_hand) || 0;
      if (available < finalDoneQty) {
        throw new AppError(
          `Insufficient stock at source ${transfer.source_path} for product ID ${item.product_id}. Available: ${available}, Required: ${finalDoneQty}.`,
          400
        );
      }
    }

    // Execute atomic relocation
    for (const item of existingItems) {
      let finalDoneQty = Number(item.demand_qty);
      if (parsed.items) {
        const matching = parsed.items.find(i => i.product_id === Number(item.product_id));
        if (matching !== undefined) finalDoneQty = Number(matching.done_qty);
      } else if (Number(item.done_qty) > 0) {
        finalDoneQty = Number(item.done_qty);
      }

      await db.execute('UPDATE operation_items SET done_qty = $1 WHERE id = $2', [finalDoneQty, item.id]);

      if (finalDoneQty > 0) {
        // 1. Deduct from source location
        await db.execute(
          'UPDATE stock_levels SET on_hand = on_hand - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND location_id = $3',
          [finalDoneQty, item.product_id, srcLocId]
        );

        // 2. Add to destination location
        const destStock = await db.queryOne<{ id: number; on_hand: number }>(
          'SELECT id, on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
          [item.product_id, destLocId]
        );

        if (destStock) {
          await db.execute(
            'UPDATE stock_levels SET on_hand = on_hand + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [finalDoneQty, destStock.id]
          );
        } else {
          await db.execute(
            'INSERT INTO stock_levels (product_id, location_id, on_hand, reserved) VALUES ($1, $2, $3, 0)',
            [item.product_id, destLocId, finalDoneQty]
          );
        }

        // 3. Immutable audit ledger in stock_history
        await db.execute(
          `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            transfer.reference,
            'INT',
            item.product_id,
            transfer.source_path,
            transfer.destination_path,
            finalDoneQty,
            'Done',
            req.user?.loginId || 'Staff',
            `Internal transfer from ${transfer.source_path} to ${transfer.destination_path}`
          ]
        );
      }
    }

    // Mark Done
    await db.execute(
      `UPDATE operations 
       SET status = 'Done', validated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: `Internal Transfer ${transfer.reference} completed. Items moved from ${transfer.source_path} to ${transfer.destination_path}.`,
      data: {
        reference: transfer.reference,
        status: 'Done'
      }
    });
  })
);

/**
 * POST /api/v1/transfers/:id/cancel
 * Cancel an unvalidated transfer.
 */
transfersRouter.post(
  '/:id/cancel',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid transfer ID', 400);

    const transfer = await db.queryOne<any>('SELECT * FROM operations WHERE id = $1 AND operation_type = $2', [id, 'INT']);
    if (!transfer) throw new AppError('Transfer not found', 404);
    if (transfer.status === 'Done') throw new AppError('Cannot cancel a completed transfer.', 400);

    await db.execute("UPDATE operations SET status = 'Cancelled' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: `Transfer ${transfer.reference} has been cancelled.`
    });
  })
);

export { transfersRouter };
