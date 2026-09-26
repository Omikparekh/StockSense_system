import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const warehousesRouter = Router();

const createWarehouseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  short_code: z.string().min(2, 'Short code must be 2 to 10 characters').max(10),
  address: z.string().optional().default('')
});

const updateWarehouseSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().optional()
});

const createLocationSchema = z.object({
  warehouse_id: z.number().int().positive('Warehouse ID is required'),
  name: z.string().min(2, 'Location name must be at least 2 characters').max(255),
  short_code: z.string().min(2, 'Short code must be 2 to 20 characters').max(20)
});

/**
 * GET /api/v1/warehouses
 * List all warehouses with child locations and inventory overview.
 */
warehousesRouter.get(
  '/',
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const warehouses = await db.query<any>(
      'SELECT * FROM warehouses ORDER BY name ASC'
    );

    const locations = await db.query<any>(
      `SELECT 
        loc.id,
        loc.warehouse_id,
        loc.name,
        loc.short_code,
        loc.path,
        loc.created_at,
        COALESCE(SUM(sl.on_hand), 0) AS total_on_hand,
        COUNT(DISTINCT sl.product_id) AS distinct_products,
        COALESCE(SUM(sl.on_hand * COALESCE(p.unit_cost, 0)), 0) AS total_valuation
       FROM locations loc
       LEFT JOIN stock_levels sl ON sl.location_id = loc.id
       LEFT JOIN products p ON sl.product_id = p.id
       GROUP BY loc.id, loc.warehouse_id, loc.name, loc.short_code, loc.path, loc.created_at
       ORDER BY loc.path ASC`
    );

    const result = warehouses.map((wh) => {
      const whLocations = locations
        .filter((l) => Number(l.warehouse_id) === Number(wh.id))
        .map((l) => ({
          id: Number(l.id),
          warehouse_id: Number(l.warehouse_id),
          name: l.name,
          short_code: l.short_code,
          path: l.path,
          total_on_hand: Number(l.total_on_hand) || 0,
          distinct_products: Number(l.distinct_products) || 0,
          total_valuation: Math.round((Number(l.total_valuation) || 0) * 100) / 100,
          created_at: l.created_at
        }));

      const totalWhOnHand = whLocations.reduce((sum, l) => sum + l.total_on_hand, 0);
      const totalWhValuation = Math.round(whLocations.reduce((sum, l) => sum + (l.total_valuation || 0), 0) * 100) / 100;

      return {
        id: Number(wh.id),
        name: wh.name,
        short_code: wh.short_code,
        address: wh.address || '',
        created_at: wh.created_at,
        total_on_hand: totalWhOnHand,
        total_valuation: totalWhValuation,
        locations: whLocations
      };
    });

    res.json({
      success: true,
      data: result
    });
  })
);

/**
 * GET /api/v1/warehouses/:id/inventory
 * List all products currently in stock in this warehouse with locations and valuations.
 */
warehousesRouter.get(
  '/:id/inventory',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const warehouseId = Number(req.params.id);
    if (isNaN(warehouseId)) {
      throw new AppError('Invalid warehouse ID', 400);
    }

    const rows = await db.query<any>(
      `SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.category,
        p.uom,
        COALESCE(p.unit_cost, 0) AS unit_cost,
        p.image_url,
        p.image_url_2,
        loc.id AS location_id,
        loc.name AS location_name,
        loc.path AS location_path,
        COALESCE(sl.on_hand, 0) AS on_hand,
        COALESCE(sl.reserved, 0) AS reserved
       FROM stock_levels sl
       JOIN locations loc ON sl.location_id = loc.id
       JOIN products p ON sl.product_id = p.id
       WHERE loc.warehouse_id = $1 AND sl.on_hand > 0
       ORDER BY p.name ASC, loc.path ASC`,
      [warehouseId]
    );

    const items = rows.map(r => {
      const onHand = Number(r.on_hand) || 0;
      const unitCost = Number(r.unit_cost) || 25.0;
      return {
        productId: Number(r.product_id),
        productName: r.product_name,
        sku: r.sku,
        category: r.category,
        uom: r.uom,
        unitCost,
        imageUrl: r.image_url,
        imageUrl2: r.image_url_2,
        locationId: Number(r.location_id),
        locationName: r.location_name,
        locationPath: r.location_path,
        onHand,
        reserved: Number(r.reserved) || 0,
        totalValuation: Math.round(onHand * unitCost * 100) / 100
      };
    });

    res.json({
      success: true,
      data: items
    });
  })
);

/**
 * POST /api/v1/warehouses
 * Register a new warehouse facility and auto-seed standard Stock & Output bins.
 */
warehousesRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createWarehouseSchema.parse(req.body);
    const code = parsed.short_code.trim().toUpperCase();

    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM warehouses WHERE UPPER(short_code) = $1',
      [code]
    );

    if (existing) {
      throw new AppError(`Warehouse with short code "${code}" already exists.`, 409);
    }

    const insertRes = await db.execute(
      'INSERT INTO warehouses (name, short_code, address) VALUES ($1, $2, $3)',
      [parsed.name.trim(), code, parsed.address?.trim() || '']
    );

    const warehouseId = insertRes.lastInsertRowid;

    if (warehouseId) {
      // Auto-provision standard Stock and Output locations
      await db.execute(
        'INSERT INTO locations (warehouse_id, name, short_code, path) VALUES ($1, $2, $3, $4)',
        [warehouseId, 'Central Stock', 'Stock', `${code}/Stock`]
      );

      await db.execute(
        'INSERT INTO locations (warehouse_id, name, short_code, path) VALUES ($1, $2, $3, $4)',
        [warehouseId, 'Dispatch Output', 'Output', `${code}/Output`]
      );
    }

    const created = await db.queryOne<any>(
      'SELECT * FROM warehouses WHERE id = $1',
      [warehouseId]
    );

    res.status(201).json({
      success: true,
      message: `Warehouse "${created.name}" (${code}) created with default locations (${code}/Stock, ${code}/Output).`,
      data: created
    });
  })
);

/**
 * PUT /api/v1/warehouses/:id
 * Update warehouse metadata.
 */
warehousesRouter.put(
  '/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid warehouse ID', 400);
    }

    const parsed = updateWarehouseSchema.parse(req.body);

    const existing = await db.queryOne<any>('SELECT * FROM warehouses WHERE id = $1', [id]);
    if (!existing) {
      throw new AppError('Warehouse not found', 404);
    }

    const name = parsed.name !== undefined ? parsed.name.trim() : existing.name;
    const address = parsed.address !== undefined ? parsed.address.trim() : existing.address;

    await db.execute(
      'UPDATE warehouses SET name = $1, address = $2 WHERE id = $3',
      [name, address, id]
    );

    const updated = await db.queryOne<any>('SELECT * FROM warehouses WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: updated
    });
  })
);

/**
 * GET /api/v1/locations
 * List warehouse storage locations with stock summaries.
 */
warehousesRouter.get(
  '/locations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : null;

    let query = `
      SELECT 
        loc.id,
        loc.warehouse_id,
        loc.name,
        loc.short_code,
        loc.path,
        loc.created_at,
        w.name AS warehouse_name,
        w.short_code AS warehouse_code,
        COALESCE(SUM(sl.on_hand), 0) AS total_on_hand,
        COUNT(DISTINCT sl.product_id) AS distinct_products
      FROM locations loc
      JOIN warehouses w ON loc.warehouse_id = w.id
      LEFT JOIN stock_levels sl ON sl.location_id = loc.id
      WHERE 1=1
    `;

    const params: any[] = [];
    if (warehouseId) {
      query += ` AND loc.warehouse_id = $1`;
      params.push(warehouseId);
    }

    query += `
      GROUP BY loc.id, loc.warehouse_id, loc.name, loc.short_code, loc.path, loc.created_at, w.name, w.short_code
      ORDER BY loc.path ASC
    `;

    const rows = await db.query<any>(query, params);

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: Number(r.id),
        warehouse_id: Number(r.warehouse_id),
        warehouse_name: r.warehouse_name,
        warehouse_code: r.warehouse_code,
        name: r.name,
        short_code: r.short_code,
        path: r.path,
        total_on_hand: Number(r.total_on_hand) || 0,
        distinct_products: Number(r.distinct_products) || 0,
        created_at: r.created_at
      }))
    });
  })
);

/**
 * POST /api/v1/locations
 * Create a specialized location (e.g. WH/Quality, WH/Scrap, WH/Zone-A).
 */
warehousesRouter.post(
  '/locations',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createLocationSchema.parse(req.body);

    const warehouse = await db.queryOne<{ id: number; short_code: string; name: string }>(
      'SELECT id, short_code, name FROM warehouses WHERE id = $1',
      [parsed.warehouse_id]
    );

    if (!warehouse) {
      throw new AppError('Warehouse not found', 404);
    }

    const shortCodeClean = parsed.short_code.trim();
    const compoundPath = `${warehouse.short_code}/${shortCodeClean}`;

    const existingPath = await db.queryOne<{ id: number }>(
      'SELECT id FROM locations WHERE LOWER(path) = LOWER($1)',
      [compoundPath]
    );

    if (existingPath) {
      throw new AppError(`Location path "${compoundPath}" already exists.`, 409);
    }

    const insertRes = await db.execute(
      'INSERT INTO locations (warehouse_id, name, short_code, path) VALUES ($1, $2, $3, $4)',
      [warehouse.id, parsed.name.trim(), shortCodeClean, compoundPath]
    );

    const created = await db.queryOne<any>(
      'SELECT * FROM locations WHERE id = $1',
      [insertRes.lastInsertRowid]
    );

    res.status(201).json({
      success: true,
      message: `Location "${compoundPath}" created successfully.`,
      data: created
    });
  })
);

/**
 * DELETE /api/v1/locations/:id
 * Delete empty location.
 */
warehousesRouter.delete(
  '/locations/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      throw new AppError('Invalid location ID', 400);
    }

    const location = await db.queryOne<any>('SELECT * FROM locations WHERE id = $1', [id]);
    if (!location) {
      throw new AppError('Location not found', 404);
    }

    // Check if location has stock
    const stockRow = await db.queryOne<{ total_on_hand: number }>(
      'SELECT COALESCE(SUM(on_hand), 0) AS total_on_hand FROM stock_levels WHERE location_id = $1',
      [id]
    );

    const onHand = Number(stockRow?.total_on_hand) || 0;
    if (onHand > 0) {
      throw new AppError(
        `Cannot delete location "${location.path}" because it currently holds ${onHand} units of stock. Relocate stock first.`,
        400
      );
    }

    await db.execute('DELETE FROM locations WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Location "${location.path}" deleted successfully.`
    });
  })
);

export { warehousesRouter };
