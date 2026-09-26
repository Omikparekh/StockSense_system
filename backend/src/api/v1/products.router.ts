import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getNextSequence } from '../../core/sequence.js';
import { ProductWithStock, LocationStock } from '../../types/index.js';

const productsRouter = Router();

export { getApproximateCost } from '../../core/costs.js';
import { getApproximateCost } from '../../core/costs.js';

const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(100),
  category: z.string().min(1, 'Category is required').max(100),
  uom: z.string().min(1, 'Unit of measure is required').default('Units'),
  per_unit_weight: z.number().min(0, 'Weight must be non-negative').default(0),
  reorder_level: z.number().min(0, 'Reorder level must be non-negative').default(10),
  unit_cost: z.number().min(0, 'Unit cost must be non-negative').optional().default(0),
  image_url: z.string().nullable().optional(),
  image_url_2: z.string().nullable().optional(),
  initial_stock: z.number().min(0, 'Initial stock must be non-negative').optional().default(0),
  location_id: z.number().optional()
});

const updateProductSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  sku: z.string().min(2).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  uom: z.string().min(1).max(50).optional(),
  per_unit_weight: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  image_url: z.string().nullable().optional(),
  image_url_2: z.string().nullable().optional()
});

const adjustStockSchema = z.object({
  counted_quantity: z.number().min(0, 'Counted quantity must be 0 or greater'),
  location_id: z.number().optional(),
  reason: z.string().min(2, 'Reason is required for inventory audit').default('Physical count reconciliation')
});

/**
 * GET /api/v1/products
 * Retrieve catalog products with calculated on-hand, reserved, and free stock.
 * Supports search, category filter, stock status filter, and warehouse filter.
 */
productsRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const category = req.query.category ? String(req.query.category).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : 'all';
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : null;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let paramIndex = 1;

    let stockSumOnHand = 'COALESCE(SUM(sl.on_hand), 0)';
    let stockSumReserved = 'COALESCE(SUM(sl.reserved), 0)';

    if (warehouseId) {
      stockSumOnHand = `COALESCE(SUM(CASE WHEN loc.warehouse_id = $${paramIndex} THEN sl.on_hand ELSE 0 END), 0)`;
      stockSumReserved = `COALESCE(SUM(CASE WHEN loc.warehouse_id = $${paramIndex} THEN sl.reserved ELSE 0 END), 0)`;
      params.push(warehouseId);
      paramIndex++;
    }

    // Base query combining products with aggregated stock_levels without cross-joins
    let query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category,
        p.uom,
        p.per_unit_weight,
        p.reorder_level,
        p.unit_cost,
        p.image_url,
        p.image_url_2,
        p.created_at,
        ${stockSumOnHand} AS on_hand,
        ${stockSumReserved} AS reserved
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      LEFT JOIN locations loc ON sl.location_id = loc.id
      WHERE 1=1
    `;

    if (search) {
      query += ` AND (LOWER(p.name) LIKE $${paramIndex} OR LOWER(p.sku) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    if (category && category !== 'All') {
      query += ` AND p.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += `
      GROUP BY p.id, p.name, p.sku, p.category, p.uom, p.per_unit_weight, p.reorder_level, p.unit_cost, p.image_url, p.image_url_2, p.created_at
      ORDER BY p.name ASC
    `;

    const rows = await db.query<any>(query, params);

    // Compute free stock, valuation, and stock status
    const allProducts: ProductWithStock[] = rows.map((r) => {
      const onHand = Number(r.on_hand) || 0;
      const reserved = Number(r.reserved) || 0;
      const freeStock = Math.max(0, onHand - reserved);
      const reorderLevel = Number(r.reorder_level) || 0;
      const rawCost = Number(r.unit_cost);
      const hasActualCost = rawCost > 0;
      const unitCost = hasActualCost ? rawCost : getApproximateCost(r.category);
      const totalValue = Math.round(onHand * unitCost * 100) / 100;

      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (onHand <= 0) {
        stockStatus = 'out_of_stock';
      } else if (onHand <= reorderLevel) {
        stockStatus = 'low_stock';
      }

      return {
        id: Number(r.id),
        name: r.name,
        sku: r.sku,
        category: r.category,
        uom: r.uom,
        per_unit_weight: Number(r.per_unit_weight) || 0,
        reorder_level: reorderLevel,
        unit_cost: unitCost,
        is_approx_cost: !hasActualCost,
        image_url: r.image_url || null,
        image_url_2: r.image_url_2 || null,
        total_value: totalValue,
        created_at: r.created_at,
        on_hand: onHand,
        reserved: reserved,
        free_stock: freeStock,
        stock_status: stockStatus
      };
    });

    // Apply stock status filter in memory if specified
    let filtered = allProducts;
    if (status && status !== 'all') {
      filtered = allProducts.filter((p) => p.stock_status === status);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Fetch distinct categories for the filter dropdown
    const categoryRows = await db.query<{ category: string }>(
      'SELECT DISTINCT category FROM products ORDER BY category ASC'
    );
    const categories = categoryRows.map((c) => c.category);

    res.json({
      success: true,
      data: {
        products: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        categories
      }
    });
  })
);

/**
 * GET /api/v1/products/categories
 * Returns all distinct product categories.
 */
productsRouter.get(
  '/categories',
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const rows = await db.query<{ category: string }>(
      'SELECT DISTINCT category FROM products ORDER BY category ASC'
    );
    res.json({
      success: true,
      data: rows.map((r) => r.category)
    });
  })
);

/**
 * GET /api/v1/products/:id
 * Retrieve single product details, location-wise breakdown, and recent move history.
 */
productsRouter.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const product = await db.queryOne<any>(
      'SELECT * FROM products WHERE id = $1',
      [productId]
    );

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Get location breakdown
    const locationsQuery = `
      SELECT 
        loc.id AS location_id,
        loc.name AS location_name,
        loc.path AS location_path,
        w.name AS warehouse_name,
        COALESCE(sl.on_hand, 0) AS on_hand,
        COALESCE(sl.reserved, 0) AS reserved
      FROM locations loc
      JOIN warehouses w ON loc.warehouse_id = w.id
      LEFT JOIN stock_levels sl ON sl.location_id = loc.id AND sl.product_id = $1
      ORDER BY loc.path ASC
    `;
    const locRows = await db.query<any>(locationsQuery, [productId]);

    let totalOnHand = 0;
    let totalReserved = 0;

    const locations: LocationStock[] = locRows.map((l) => {
      const onHand = Number(l.on_hand) || 0;
      const reserved = Number(l.reserved) || 0;
      totalOnHand += onHand;
      totalReserved += reserved;
      return {
        location_id: Number(l.location_id),
        location_name: l.location_name,
        location_path: l.location_path,
        warehouse_name: l.warehouse_name,
        on_hand: onHand,
        reserved: reserved,
        free_stock: Math.max(0, onHand - reserved)
      };
    });

    const reorderLevel = Number(product.reorder_level) || 0;
    const rawCost = Number(product.unit_cost);
    const hasActualCost = rawCost > 0;
    const unitCost = hasActualCost ? rawCost : getApproximateCost(product.category);
    const totalValue = Math.round(totalOnHand * unitCost * 100) / 100;

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (totalOnHand <= 0) {
      stockStatus = 'out_of_stock';
    } else if (totalOnHand <= reorderLevel) {
      stockStatus = 'low_stock';
    }

    // Get recent stock history for this product
    const historyRows = await db.query<any>(
      `SELECT * FROM stock_history WHERE product_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [productId]
    );

    res.json({
      success: true,
      data: {
        product: {
          id: Number(product.id),
          name: product.name,
          sku: product.sku,
          category: product.category,
          uom: product.uom,
          per_unit_weight: Number(product.per_unit_weight) || 0,
          reorder_level: reorderLevel,
          unit_cost: unitCost,
          is_approx_cost: !hasActualCost,
          image_url: product.image_url || null,
          image_url_2: product.image_url_2 || null,
          total_value: totalValue,
          created_at: product.created_at,
          on_hand: totalOnHand,
          reserved: totalReserved,
          free_stock: Math.max(0, totalOnHand - totalReserved),
          stock_status: stockStatus
        },
        locations,
        recentMovements: historyRows
      }
    });
  })
);

/**
 * POST /api/v1/products
 * Create a new product. Optional initial stock creates stock level and ledger entry.
 */
productsRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createProductSchema.parse(req.body);

    // Check SKU uniqueness
    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM products WHERE LOWER(sku) = LOWER($1)',
      [parsed.sku.trim()]
    );
    if (existing) {
      throw new AppError(`A product with SKU "${parsed.sku}" already exists.`, 409);
    }

    const effectiveCost = (parsed.unit_cost && parsed.unit_cost > 0) ? parsed.unit_cost : getApproximateCost(parsed.category);

    const insertRes = await db.execute(
      `INSERT INTO products (name, sku, category, uom, per_unit_weight, reorder_level, unit_cost, image_url, image_url_2)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        parsed.name.trim(),
        parsed.sku.trim().toUpperCase(),
        parsed.category.trim(),
        parsed.uom.trim(),
        parsed.per_unit_weight,
        parsed.reorder_level,
        effectiveCost,
        parsed.image_url || null,
        parsed.image_url_2 || null
      ]
    );

    const productId = insertRes.lastInsertRowid;

    // Handle initial stock balance if provided
    if (parsed.initial_stock && parsed.initial_stock > 0 && productId) {
      // Find location
      let targetLocId = parsed.location_id;
      let targetPath = 'WH/Stock';

      if (targetLocId) {
        const loc = await db.queryOne<{ id: number; path: string }>('SELECT id, path FROM locations WHERE id = $1', [targetLocId]);
        if (loc) {
          targetPath = loc.path;
        }
      } else {
        const defaultLoc = await db.queryOne<{ id: number; path: string }>(
          "SELECT id, path FROM locations WHERE path = 'WH/Stock' LIMIT 1"
        );
        if (defaultLoc) {
          targetLocId = defaultLoc.id;
          targetPath = defaultLoc.path;
        } else {
          const firstLoc = await db.queryOne<{ id: number; path: string }>('SELECT id, path FROM locations LIMIT 1');
          if (firstLoc) {
            targetLocId = firstLoc.id;
            targetPath = firstLoc.path;
          }
        }
      }

      if (targetLocId) {
        await db.execute(
          `INSERT INTO stock_levels (product_id, location_id, on_hand, reserved) VALUES ($1, $2, $3, 0)`,
          [productId, targetLocId, parsed.initial_stock]
        );

        const ref = await getNextSequence('WH', 'ADJ');
        await db.execute(
          `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            ref,
            'ADJ',
            productId,
            'Inventory Opening Balance',
            targetPath,
            parsed.initial_stock,
            'Done',
            req.user?.loginId || 'Admin',
            'Initial inventory on product catalog creation'
          ]
        );
      }
    }

    const created = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [productId]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: created
    });
  })
);

/**
 * PUT /api/v1/products/:id
 * Update product catalog metadata.
 */
productsRouter.put(
  '/:id',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const parsed = updateProductSchema.parse(req.body);

    const existing = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [productId]);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    if (parsed.sku && parsed.sku.trim().toLowerCase() !== existing.sku.toLowerCase()) {
      const skuConflict = await db.queryOne<{ id: number }>(
        'SELECT id FROM products WHERE LOWER(sku) = LOWER($1) AND id != $2',
        [parsed.sku.trim(), productId]
      );
      if (skuConflict) {
        throw new AppError(`SKU "${parsed.sku}" is already taken by another product.`, 409);
      }
    }

    const updatedName = parsed.name !== undefined ? parsed.name.trim() : existing.name;
    const updatedSku = parsed.sku !== undefined ? parsed.sku.trim().toUpperCase() : existing.sku;
    const updatedCategory = parsed.category !== undefined ? parsed.category.trim() : existing.category;
    const updatedUom = parsed.uom !== undefined ? parsed.uom.trim() : existing.uom;
    const updatedWeight = parsed.per_unit_weight !== undefined ? parsed.per_unit_weight : existing.per_unit_weight;
    const updatedReorder = parsed.reorder_level !== undefined ? parsed.reorder_level : existing.reorder_level;
    const updatedCost = parsed.unit_cost !== undefined ? parsed.unit_cost : existing.unit_cost;
    const updatedImg1 = parsed.image_url !== undefined ? parsed.image_url : existing.image_url;
    const updatedImg2 = parsed.image_url_2 !== undefined ? parsed.image_url_2 : existing.image_url_2;

    await db.execute(
      `UPDATE products 
       SET name = $1, sku = $2, category = $3, uom = $4, per_unit_weight = $5, reorder_level = $6, unit_cost = $7, image_url = $8, image_url_2 = $9
       WHERE id = $10`,
      [updatedName, updatedSku, updatedCategory, updatedUom, updatedWeight, updatedReorder, updatedCost, updatedImg1, updatedImg2, productId]
    );

    const updated = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [productId]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated
    });
  })
);

/**
 * DELETE /api/v1/products/:id
 * Delete product if zero stock on hand.
 */
productsRouter.delete(
  '/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const existing = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [productId]);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    // Verify stock on hand
    const stockRow = await db.queryOne<{ total_on_hand: number }>(
      'SELECT COALESCE(SUM(on_hand), 0) AS total_on_hand FROM stock_levels WHERE product_id = $1',
      [productId]
    );

    const currentStock = Number(stockRow?.total_on_hand) || 0;
    if (currentStock > 0) {
      throw new AppError(
        `Cannot delete product "${existing.name}" because it still has ${currentStock} ${existing.uom} of stock on hand. Reconcile or adjust stock to 0 first.`,
        400
      );
    }

    // Check if referenced in stock history
    const historyCount = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) AS count FROM stock_history WHERE product_id = $1',
      [productId]
    );
    if (Number(historyCount?.count) > 0) {
      throw new AppError(
        `Cannot delete product "${existing.name}" because it has ${historyCount?.count} recorded audit ledger movements. Historical records must be preserved.`,
        400
      );
    }

    await db.execute('DELETE FROM products WHERE id = $1', [productId]);

    res.json({
      success: true,
      message: `Product "${existing.name}" (${existing.sku}) deleted successfully.`
    });
  })
);

/**
 * POST /api/v1/products/:id/adjust
 * In-Table Quick Reconciliation: Adjust physical count vs recorded stock.
 * Calculates delta, atomically updates stock_levels, and logs an auditable WH/ADJ/00001 entry.
 */
productsRouter.post(
  '/:id/adjust',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      throw new AppError('Invalid product ID', 400);
    }

    const parsed = adjustStockSchema.parse(req.body);

    const product = await db.queryOne<any>('SELECT * FROM products WHERE id = $1', [productId]);
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
        throw new AppError('Specified location not found', 404);
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
      [productId, targetLocId]
    );

    const currentOnHand = existingStock ? Number(existingStock.on_hand) : 0;
    const delta = parsed.counted_quantity - currentOnHand;

    if (delta === 0) {
      res.json({
        success: true,
        message: `Stock level for "${product.name}" at ${targetLoc.path} is already accurate (${currentOnHand} ${product.uom}). No change recorded.`,
        data: {
          productId,
          locationId: targetLocId,
          locationPath: targetLoc.path,
          previousQuantity: currentOnHand,
          countedQuantity: parsed.counted_quantity,
          delta: 0
        }
      });
      return;
    }

    // Update or insert stock level
    if (existingStock) {
      await db.execute(
        'UPDATE stock_levels SET on_hand = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [parsed.counted_quantity, existingStock.id]
      );
    } else {
      await db.execute(
        'INSERT INTO stock_levels (product_id, location_id, on_hand, reserved) VALUES ($1, $2, $3, 0)',
        [productId, targetLocId, parsed.counted_quantity]
      );
    }

    // Generate ERP sequence reference (e.g. WH/ADJ/00001)
    const sequenceRef = await getNextSequence(whCode, 'ADJ');

    // Determine audit ledger movement path
    let fromLocation: string;
    let toLocation: string;

    if (delta > 0) {
      fromLocation = 'Virtual/Adjustment (Inventory Gain)';
      toLocation = targetLoc.path;
    } else {
      fromLocation = targetLoc.path;
      toLocation = 'Virtual/Adjustment (Inventory Loss/Damage)';
    }

    const auditNotes = `Reconciliation: Counted ${parsed.counted_quantity} ${product.uom} (recorded was ${currentOnHand}, delta ${delta >= 0 ? '+' : ''}${delta}). Reason: ${parsed.reason}`;

    await db.execute(
      `INSERT INTO stock_history (reference, operation_type, product_id, from_location, to_location, quantity, status, user_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sequenceRef,
        'ADJ',
        productId,
        fromLocation,
        toLocation,
        Math.abs(delta),
        'Done',
        req.user?.loginId || 'Staff',
        auditNotes
      ]
    );

    res.json({
      success: true,
      message: `Stock successfully reconciled for "${product.name}".`,
      data: {
        reference: sequenceRef,
        productId,
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

export { productsRouter };
