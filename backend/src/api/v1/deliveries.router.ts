import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getNextSequence } from '../../core/sequence.js';

const deliveriesRouter = Router();

const deliveryItemSchema = z.object({
  product_id: z.number().int().positive('Product ID is required'),
  demand_qty: z.number().positive('Demand quantity must be greater than 0'),
  done_qty: z.number().min(0).optional().default(0)
});

const createDeliverySchema = z.object({
  warehouse_id: z.number().int().positive().optional(),
  partner_name: z.string().min(2, 'Customer / Client name is required').max(255),
  source_location_id: z.number().int().positive().optional(),
  destination_location_id: z.number().int().positive().optional(),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().optional().default(''),
  items: z.array(deliveryItemSchema).min(1, 'Delivery order must have at least one product line item')
});

const validateDeliverySchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    done_qty: z.number().min(0)
  })).optional()
});

/**
 * Helper to evaluate availability for an operation's line items.
 * If every product has on_hand >= demand_qty, returns 'Ready', else 'Waiting'.
 */
async function evaluateAvailability(
  sourceLocationId: number,
  items: { product_id: number; demand_qty: number }[]
): Promise<{ status: 'Ready' | 'Waiting'; itemStatuses: { product_id: number; available: number; sufficient: boolean }[] }> {
  const itemStatuses: { product_id: number; available: number; sufficient: boolean }[] = [];
  let allSufficient = true;

  for (const item of items) {
    const stockRow = await db.queryOne<{ on_hand: number; reserved: number }>(
      'SELECT on_hand, reserved FROM stock_levels WHERE product_id = $1 AND location_id = $2',
      [item.product_id, sourceLocationId]
    );

    const onHand = Number(stockRow?.on_hand) || 0;
    const reserved = Number(stockRow?.reserved) || 0;
    const freeStock = Math.max(0, onHand - reserved);
    const sufficient = freeStock >= item.demand_qty;

    if (!sufficient) {
      allSufficient = false;
    }

    itemStatuses.push({
      product_id: item.product_id,
      available: freeStock,
      sufficient
    });
  }

  return {
    status: allSufficient ? 'Ready' : 'Waiting',
    itemStatuses
  };
}

/**
 * GET /api/v1/deliveries
 * List outbound delivery orders with status, customer, warehouse, and availability metrics.
 */
deliveriesRouter.get(
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
      WHERE op.operation_type = 'OUT'
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
               op.partner_name, op.source_location_id, src.path, src.name,
               op.destination_location_id, dest.path, dest.name,
               op.scheduled_date, op.status, op.notes, op.created_by_user, op.created_at, op.validated_at
      ORDER BY op.id DESC
    `;

    const rows = await db.query<any>(query, params);

    const deliveries = rows.map((r) => ({
      id: Number(r.id),
      reference: r.reference,
      operation_type: r.operation_type,
      warehouse_id: Number(r.warehouse_id),
      warehouse_name: r.warehouse_name,
      warehouse_code: r.warehouse_code,
      partner_name: r.partner_name,
      source_location_id: r.source_location_id ? Number(r.source_location_id) : null,
      source_path: r.source_path || 'WH/Stock',
      source_name: r.source_name || 'Central Stock',
      destination_location_id: r.destination_location_id ? Number(r.destination_location_id) : null,
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
      data: deliveries
    });
  })
);

/**
 * GET /api/v1/deliveries/:id
 * Retrieve single delivery details with line items and product availability checks.
 */
deliveriesRouter.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid delivery ID', 400);

    const delivery = await db.queryOne<any>(
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
       WHERE op.id = $1 AND op.operation_type = 'OUT'`,
      [id]
    );

    if (!delivery) throw new AppError('Delivery order not found', 404);

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
        COALESCE(sl.on_hand, 0) AS current_on_hand,
        COALESCE(sl.reserved, 0) AS current_reserved
       FROM operation_items oi
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN stock_levels sl ON sl.product_id = p.id AND sl.location_id = $2
       WHERE oi.operation_id = $1
       ORDER BY oi.id ASC`,
      [id, delivery.source_location_id]
    );

    res.json({
      success: true,
      data: {
        delivery: {
          ...delivery,
          id: Number(delivery.id),
          warehouse_id: Number(delivery.warehouse_id),
          source_location_id: Number(delivery.source_location_id),
          destination_location_id: Number(delivery.destination_location_id)
        },
        items: items.map((i) => {
          const onHand = Number(i.current_on_hand);
          const reserved = Number(i.current_reserved);
          const freeStock = Math.max(0, onHand - reserved);
          const demand = Number(i.demand_qty);

          return {
            id: Number(i.id),
            operation_id: Number(i.operation_id),
            product_id: Number(i.product_id),
            product_name: i.product_name,
            product_sku: i.product_sku,
            product_category: i.product_category,
            product_uom: i.product_uom,
            per_unit_weight: Number(i.per_unit_weight) || 0,
            demand_qty: demand,
            done_qty: Number(i.done_qty),
            current_on_hand: onHand,
            free_stock: freeStock,
            is_available: delivery.status === 'Done' ? true : freeStock >= demand
          };
        })
      }
    });
  })
);

/**
 * POST /api/v1/deliveries
 * Create a new Delivery Order (WH/OUT/0000X) with automatic availability evaluation.
 * If stock is sufficient -> 'Ready', if insufficient -> 'Waiting'.
 */
deliveriesRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createDeliverySchema.parse(req.body);

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

    // Resolve source location (WH/Stock)
    let srcLocId = parsed.source_location_id;
    if (!srcLocId) {
      const defaultLoc = await db.queryOne<{ id: number }>(
        'SELECT id FROM locations WHERE warehouse_id = $1 AND short_code = $2',
        [warehouseId, 'Stock']
      );
      srcLocId = defaultLoc ? defaultLoc.id : 1;
    }

    // Resolve destination location (WH/Output)
    let destLocId = parsed.destination_location_id;
    if (!destLocId) {
      const outputLoc = await db.queryOne<{ id: number }>(
        'SELECT id FROM locations WHERE warehouse_id = $1 AND short_code = $2',
        [warehouseId, 'Output']
      );
      destLocId = outputLoc ? outputLoc.id : 2;
    }

    // Real-time stock availability check
    const availability = await evaluateAvailability(srcLocId, parsed.items);
    const initialStatus = availability.status; // 'Ready' or 'Waiting'

    // Generate sequence (e.g. WH/OUT/00003)
    const sequenceRef = await getNextSequence(whCode, 'OUT');

    const opRes = await db.execute(
      `INSERT INTO operations (reference, operation_type, warehouse_id, partner_name, source_location_id, destination_location_id, scheduled_date, status, notes, created_by_user)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sequenceRef,
        'OUT',
        warehouseId,
        parsed.partner_name.trim(),
        srcLocId,
        destLocId,
        parsed.scheduled_date,
        initialStatus,
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
      message: `Delivery Order ${sequenceRef} created. Initial status: ${initialStatus}.`,
      data: {
        id: operationId,
        reference: sequenceRef,
        status: initialStatus
      }
    });
  })
);

/**
 * POST /api/v1/deliveries/:id/check-availability
 * Re-evaluates stock levels for a 'Waiting' delivery order.
 * If stock is now available (e.g. after a receipt was validated), automatically flips to 'Ready'!
 */
deliveriesRouter.post(
  '/:id/check-availability',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid delivery ID', 400);

    const delivery = await db.queryOne<any>(
      'SELECT * FROM operations WHERE id = $1 AND operation_type = $2',
      [id, 'OUT']
    );
    if (!delivery) throw new AppError('Delivery order not found', 404);
    if (delivery.status === 'Done') throw new AppError('Delivery is already completed.', 400);

    const items = await db.query<any>(
      'SELECT product_id, demand_qty FROM operation_items WHERE operation_id = $1',
      [id]
    );

    const availability = await evaluateAvailability(
      delivery.source_location_id,
      items.map(i => ({ product_id: Number(i.product_id), demand_qty: Number(i.demand_qty) }))
    );

    const newStatus = availability.status; // 'Ready' or 'Waiting'

    if (newStatus !== delivery.status) {
      await db.execute('UPDATE operations SET status = $1 WHERE id = $2', [newStatus, id]);
    }

    res.json({
      success: true,
      message: newStatus === 'Ready' 
        ? `Sufficient stock available! Delivery ${delivery.reference} is now Ready for dispatch.`
        : `Stock is still insufficient. Delivery ${delivery.reference} remains in Waiting status.`,
      data: {
        reference: delivery.reference,
        previousStatus: delivery.status,
        newStatus,
        itemStatuses: availability.itemStatuses
      }
    });
  })
);

/**
 * POST /api/v1/deliveries/:id/validate
 * ATOMIC OUTBOUND DISPATCH:
 * Validates delivery, atomically deducts On Hand in stock_levels at source location,
 * generates an immutable audit ledger entry in stock_history, and marks operation Done.
 */
deliveriesRouter.post(
  '/:id/validate',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid delivery ID', 400);

    const delivery = await db.queryOne<any>(
      `SELECT op.*, src.path AS source_path 
       FROM operations op
       LEFT JOIN locations src ON op.source_location_id = src.id
       WHERE op.id = $1 AND op.operation_type = 'OUT'`,
      [id]
    );

    if (!delivery) throw new AppError('Delivery order not found', 404);
    if (delivery.status === 'Done') throw new AppError('This delivery has already been validated.', 400);

    const parsed = validateDeliverySchema.parse(req.body);
    const existingItems = await db.query<any>('SELECT * FROM operation_items WHERE operation_id = $1', [id]);

    if (existingItems.length === 0) {
      throw new AppError('Cannot validate a delivery order without product lines.', 400);
    }

    const sourceLocationId = delivery.source_location_id;
    const sourcePath = delivery.source_path || 'WH/Stock';

    // Verify stock availability before committing deduction
    for (const item of existingItems) {
      let finalDoneQty = Number(item.demand_qty);
      if (parsed.items) {
        const matching = parsed.items.find(i => i.product_id === Number(item.product_id));
        if (matching !== undefined) finalDoneQty = Number(matching.done_qty);
      } else if (Number(item.done_qty) > 0) {
        finalDoneQty = Number(item.done_qty);
      }

      const stockRow = await db.queryOne<{ id: number; on_hand: number }>(
        'SELECT id, on_hand FROM stock_levels WHERE product_id = $1 AND location_id = $2',
        [item.product_id, sourceLocationId]
      );

      const onHand = Number(stockRow?.on_hand) || 0;
      if (onHand < finalDoneQty) {
        throw new AppError(
          `Insufficient stock for product ID ${item.product_id}. Available on hand: ${onHand}, Requested dispatch: ${finalDoneQty}.`,
          400
        );
      }
    }

    // Process deduction and audit ledger
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
        // Atomic deduction from stock_levels
        await db.execute(
          'UPDATE stock_levels SET on_hand = on_hand - $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 AND location_id = $3',
          [finalDoneQty, item.product_id, sourceLocationId]
        );

        // Immutable ledger record
        await db.execute(
          `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            delivery.reference,
            'OUT',
            item.product_id,
            sourcePath,
            `Customer (${delivery.partner_name})`,
            finalDoneQty,
            'Done',
            req.user?.loginId || 'Staff',
            `Validated customer dispatch under ${delivery.reference}`
          ]
        );
      }
    }

    // Set status to Done
    await db.execute(
      `UPDATE operations 
       SET status = 'Done', validated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: `Delivery Order ${delivery.reference} successfully dispatched and inventory deducted.`,
      data: {
        reference: delivery.reference,
        status: 'Done'
      }
    });
  })
);

/**
 * POST /api/v1/deliveries/:id/cancel
 * Cancel an unvalidated delivery order.
 */
deliveriesRouter.post(
  '/:id/cancel',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid delivery ID', 400);

    const delivery = await db.queryOne<any>('SELECT * FROM operations WHERE id = $1 AND operation_type = $2', [id, 'OUT']);
    if (!delivery) throw new AppError('Delivery order not found', 404);
    if (delivery.status === 'Done') throw new AppError('Cannot cancel a completed delivery.', 400);

    await db.execute("UPDATE operations SET status = 'Cancelled' WHERE id = $1", [id]);

    res.json({
      success: true,
      message: `Delivery ${delivery.reference} has been cancelled.`
    });
  })
);

export { deliveriesRouter };
