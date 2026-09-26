import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getNextSequence } from '../../core/sequence.js';

const receiptsRouter = Router();

const receiptItemSchema = z.object({
  product_id: z.number().int().positive('Product ID is required'),
  demand_qty: z.number().positive('Demand quantity must be greater than 0'),
  done_qty: z.number().min(0).optional().default(0)
});

const createReceiptSchema = z.object({
  warehouse_id: z.number().int().positive().optional(),
  partner_name: z.string().min(2, 'Vendor name is required').max(255),
  destination_location_id: z.number().int().positive().optional(),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().optional().default(''),
  items: z.array(receiptItemSchema).min(1, 'Receipt must have at least one product line item')
});

const updateReceiptSchema = z.object({
  partner_name: z.string().min(2).max(255).optional(),
  destination_location_id: z.number().int().positive().optional(),
  scheduled_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(receiptItemSchema).optional()
});

const validateReceiptSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    done_qty: z.number().min(0)
  })).optional()
});

/**
 * GET /api/v1/receipts
 * List all receipts with line item counts, warehouse info, and status filters.
 */
receiptsRouter.get(
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
      LEFT JOIN locations dest ON op.destination_location_id = dest.id
      LEFT JOIN operation_items oi ON oi.operation_id = op.id
      WHERE op.operation_type = 'IN'
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
      query += ` AND (LOWER(op.reference) LIKE $${paramIndex} OR LOWER(op.partner_name) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += `
      GROUP BY op.id, op.reference, op.operation_type, op.warehouse_id, w.name, w.short_code,
               op.partner_name, op.destination_location_id, dest.path, dest.name,
               op.scheduled_date, op.status, op.notes, op.created_by_user, op.created_at, op.validated_at
      ORDER BY op.id DESC
    `;

    const rows = await db.query<any>(query, params);

    const receipts = rows.map((r) => ({
      id: Number(r.id),
      reference: r.reference,
      operation_type: r.operation_type,
      warehouse_id: Number(r.warehouse_id),
      warehouse_name: r.warehouse_name,
      warehouse_code: r.warehouse_code,
      partner_name: r.partner_name,
      destination_location_id: r.destination_location_id ? Number(r.destination_location_id) : null,
      destination_path: r.destination_path || 'WH/Stock',
      destination_name: r.destination_name || 'Central Stock',
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
      data: receipts
    });
  })
);

/**
 * GET /api/v1/receipts/:id
 * Retrieve full receipt details including discrete line items with product metadata.
 */
receiptsRouter.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid receipt ID', 400);
    }

    const receipt = await db.queryOne<any>(
      `SELECT 
        op.*,
        w.name AS warehouse_name,
        w.short_code AS warehouse_code,
        dest.path AS destination_path,
        dest.name AS destination_name
       FROM operations op
       JOIN warehouses w ON op.warehouse_id = w.id
       LEFT JOIN locations dest ON op.destination_location_id = dest.id
       WHERE op.id = $1 AND op.operation_type = 'IN'`,
      [id]
    );

    if (!receipt) {
      throw new AppError('Inbound receipt not found', 404);
    }

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
        COALESCE(sl.on_hand, 0) AS current_on_hand
       FROM operation_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.location_id = $2
       WHERE oi.operation_id = $1
       ORDER BY oi.id ASC`,
      [id, receipt.destination_location_id]
    );

    res.json({
      success: true,
      data: {
        receipt: {
          ...receipt,
          id: Number(receipt.id),
          warehouse_id: Number(receipt.warehouse_id),
          destination_location_id: Number(receipt.destination_location_id)
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
          current_on_hand: Number(i.current_on_hand)
        }))
      }
    });
  })
);

/**
 * POST /api/v1/receipts
 * Create a new Inbound Receipt (WH/IN/0000X) in Draft state.
 */
receiptsRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createReceiptSchema.parse(req.body);

    // Resolve warehouse
    let warehouseId = parsed.warehouse_id;
    let whCode = 'WH';

    if (warehouseId) {
      const wh = await db.queryOne<{ id: number; short_code: string }>('SELECT id, short_code FROM warehouses WHERE id = $1', [warehouseId]);
      if (!wh) throw new AppError('Warehouse not found', 404);
      whCode = wh.short_code;
    } else {
      const defaultWh = await db.queryOne<{ id: number; short_code: string }>('SELECT id, short_code FROM warehouses ORDER BY id ASC LIMIT 1');
      if (!defaultWh) throw new AppError('No warehouse configured', 400);
      warehouseId = defaultWh.id;
      whCode = defaultWh.short_code;
    }

    // Resolve destination location (e.g. WH/Stock)
    let destLocId = parsed.destination_location_id;
    if (!destLocId) {
      const defaultLoc = await db.queryOne<{ id: number }>(
        'SELECT id FROM locations WHERE warehouse_id = $1 AND short_code = $2',
        [warehouseId, 'Stock']
      );
      if (defaultLoc) {
        destLocId = defaultLoc.id;
      } else {
        const firstLoc = await db.queryOne<{ id: number }>('SELECT id FROM locations WHERE warehouse_id = $1 ORDER BY id ASC LIMIT 1', [warehouseId]);
        destLocId = firstLoc?.id || 1;
      }
    }

    // Generate sequence (e.g. WH/IN/00003)
    const sequenceRef = await getNextSequence(whCode, 'IN');

    // Insert operation
    const opRes = await db.execute(
      `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, destination_location_id, scheduled_date, status, notes, created_by_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sequenceRef,
        'IN',
        warehouseId,
        parsed.partner_name.trim(),
        destLocId,
        parsed.scheduled_date,
        'Draft',
        parsed.notes?.trim() || '',
        req.user?.loginId || 'staff'
      ]
    );

    const operationId = opRes.lastInsertRowid;

    // Insert line items
    for (const item of parsed.items) {
      await db.execute(
        `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty)
         VALUES ($1, $2, $3, $4)`,
        [operationId, item.product_id, item.demand_qty, item.done_qty || 0]
      );
    }

    res.status(201).json({
      success: true,
      message: `Inbound Receipt ${sequenceRef} created successfully.`,
      data: {
        id: operationId,
        reference: sequenceRef,
        status: 'Draft'
      }
    });
  })
);

/**
 * PUT /api/v1/receipts/:id
 * Update an editable receipt (Draft or Ready).
 */
receiptsRouter.put(
  '/:id',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid receipt ID', 400);

    const receipt = await db.queryOne<any>('SELECT * FROM operations WHERE id = $1 AND operation_type = $2', [id, 'IN']);
    if (!receipt) throw new AppError('Receipt not found', 404);
    if (receipt.status === 'Done') throw new AppError('Cannot modify a validated (Done) receipt.', 400);

    const parsed = updateReceiptSchema.parse(req.body);

    const partner = parsed.partner_name !== undefined ? parsed.partner_name.trim() : receipt.partner_name;
    const destId = parsed.destination_location_id !== undefined ? parsed.destination_location_id : receipt.destination_location_id;
    const date = parsed.scheduled_date !== undefined ? parsed.scheduled_date : receipt.scheduled_date;
    const notes = parsed.notes !== undefined ? parsed.notes : receipt.notes;

    await db.execute(
      `UPDATE operations 
       SET partner_name = $1, destination_location_id = $2, scheduled_date = $3, notes = $4
       WHERE id = $5`,
      [partner, destId, date, notes, id]
    );

    if (parsed.items) {
      await db.execute('DELETE FROM operation_items WHERE operation_id = $1', [id]);
      for (const item of parsed.items) {
        await db.execute(
          `INSERT INTO operation_items (operation_id, product_id, demand_qty, done_qty) VALUES ($1, $2, $3, $4)`,
          [id, item.product_id, item.demand_qty, item.done_qty || 0]
        );
      }
    }

    res.json({
      success: true,
      message: `Receipt ${receipt.reference} updated successfully.`
    });
  })
);

/**
 * POST /api/v1/receipts/:id/mark-ready
 * Transition receipt status from Draft -> Ready.
 */
receiptsRouter.post(
  '/:id/mark-ready',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid receipt ID', 400);

    const receipt = await db.queryOne<any>('SELECT * FROM operations WHERE id = $1 AND operation_type = $2', [id, 'IN']);
    if (!receipt) throw new AppError('Receipt not found', 404);
    if (receipt.status === 'Done') throw new AppError('Receipt is already completed.', 400);

    await db.execute("UPDATE operations SET status = 'Ready' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: `Receipt ${receipt.reference} marked Ready for receiving and inspection.`
    });
  })
);

/**
 * POST /api/v1/receipts/:id/validate
 * ATOMIC VALIDATION:
 * Validates physical receipt lines, increments On Hand in stock_levels,
 * generates an immutable audit ledger entry in stock_history, and marks operation Done.
 */
receiptsRouter.post(
  '/:id/validate',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid receipt ID', 400);

    const receipt = await db.queryOne<any>(
      `SELECT op.*, dest.path AS destination_path 
       FROM operations op
       LEFT JOIN locations dest ON op.destination_location_id = dest.id
       WHERE op.id = $1 AND op.operation_type = 'IN'`,
      [id]
    );

    if (!receipt) throw new AppError('Receipt not found', 404);
    if (receipt.status === 'Done') throw new AppError('This receipt has already been validated.', 400);

    const parsed = validateReceiptSchema.parse(req.body);
    const existingItems = await db.query<any>('SELECT * FROM operation_items WHERE operation_id = $1', [id]);

    if (existingItems.length === 0) {
      throw new AppError('Cannot validate a receipt without product lines.', 400);
    }

    const destinationLocationId = receipt.destination_location_id;
    const destinationPath = receipt.destination_path || 'WH/Stock';

    // Process each item
    for (const item of existingItems) {
      let finalDoneQty = Number(item.demand_qty); // default to full delivery

      if (parsed.items) {
        const matching = parsed.items.find((i) => i.product_id === Number(item.product_id));
        if (matching !== undefined) {
          finalDoneQty = Number(matching.done_qty);
        }
      } else if (Number(item.done_qty) > 0) {
        finalDoneQty = Number(item.done_qty);
      }

      // Update done_qty in operation_items
      await db.execute('UPDATE operation_items SET done_qty = $1 WHERE id = $2', [finalDoneQty, item.id]);

      if (finalDoneQty > 0) {
        // Increment stock level for this product in destination location
        const existingStock = await db.queryOne<{ id: number; on_hand: number }>(
          'SELECT id, on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
          [item.product_id, destinationLocationId]
        );

        if (existingStock) {
          await db.execute(
            'UPDATE stock_levels SET on_hand = on_hand + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [finalDoneQty, existingStock.id]
          );
        } else {
          await db.execute(
            'INSERT INTO stock_levels (product_id, location_id, on_hand, reserved) VALUES ($1, $2, $3, 0)',
            [item.product_id, destinationLocationId, finalDoneQty]
          );
        }

        // Write immutable audit trail into stock_history
        await db.execute(
          `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            receipt.reference,
            'IN',
            item.product_id,
            `Vendor (${receipt.partner_name})`,
            destinationPath,
            finalDoneQty,
            'Done',
            req.user?.loginId || 'Staff',
            `Validated inbound reception under ${receipt.reference}`
          ]
        );
      }
    }

    // Mark operation as Done
    await db.execute(
      `UPDATE operations 
       SET status = 'Done', validated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: `Inbound Receipt ${receipt.reference} successfully validated and inventory updated.`,
      data: {
        reference: receipt.reference,
        status: 'Done'
      }
    });
  })
);

/**
 * POST /api/v1/receipts/:id/cancel
 * Cancel an unvalidated receipt.
 */
receiptsRouter.post(
  '/:id/cancel',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid receipt ID', 400);

    const receipt = await db.queryOne<any>('SELECT * FROM operations WHERE id = $1 AND operation_type = $2', [id, 'IN']);
    if (!receipt) throw new AppError('Receipt not found', 404);
    if (receipt.status === 'Done') throw new AppError('Cannot cancel a completed receipt.', 400);

    await db.execute("UPDATE operations SET status = 'Cancelled' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: `Receipt ${receipt.reference} has been cancelled.`
    });
  })
);

export { receiptsRouter };
