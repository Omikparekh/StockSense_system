import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

export const partnersRouter = Router();

const createPartnerSchema = z.object({
  name: z.string().min(2, 'Partner / Company name must be at least 2 characters').max(255),
  type: z.enum(['supplier', 'customer']).default('supplier'),
  contact_name: z.string().max(255).optional().default(''),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(100).optional().default(''),
  address: z.string().optional().default(''),
  tax_id: z.string().max(100).optional().default(''),
  payment_terms: z.string().max(100).optional().default('Net 30'),
  notes: z.string().optional().default('')
});

const updatePartnerSchema = createPartnerSchema.partial();

/**
 * GET /api/v1/partners
 * List partners with optional filtering by type (supplier | customer) and search text.
 */
partnersRouter.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const type = req.query.type ? String(req.query.type).trim() : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    let query = `
      SELECT 
        p.id,
        p.name,
        p.type,
        p.contact_name,
        p.email,
        p.phone,
        p.address,
        p.tax_id,
        p.payment_terms,
        p.notes,
        p.created_at,
        (SELECT COUNT(*) FROM operations op WHERE op.partner_name = p.name) AS operations_count
      FROM partners p
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND p.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      query += ` AND (LOWER(p.name) LIKE $${paramIndex} OR LOWER(p.contact_name) LIKE $${paramIndex} OR LOWER(p.email) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY p.name ASC`;

    const rows = await db.query<any>(query, params);

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        type: r.type,
        contact_name: r.contact_name || '',
        email: r.email || '',
        phone: r.phone || '',
        address: r.address || '',
        tax_id: r.tax_id || '',
        payment_terms: r.payment_terms || 'Net 30',
        notes: r.notes || '',
        operations_count: Number(r.operations_count) || 0,
        created_at: r.created_at
      }))
    });
  })
);

/**
 * GET /api/v1/partners/:id
 * Retrieve a single partner by ID.
 */
partnersRouter.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid partner ID', 400);

    const partner = await db.queryOne<any>(
      `SELECT 
        p.*,
        (SELECT COUNT(*) FROM operations op WHERE op.partner_name = p.name) AS operations_count
       FROM partners p WHERE p.id = $1`,
      [id]
    );

    if (!partner) throw new AppError('Partner not found', 404);

    res.json({
      success: true,
      data: {
        id: Number(partner.id),
        name: partner.name,
        type: partner.type,
        contact_name: partner.contact_name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        address: partner.address || '',
        tax_id: partner.tax_id || '',
        payment_terms: partner.payment_terms || 'Net 30',
        notes: partner.notes || '',
        operations_count: Number(partner.operations_count) || 0,
        created_at: partner.created_at
      }
    });
  })
);

/**
 * POST /api/v1/partners
 * Create a new partner / supplier.
 */
partnersRouter.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'inventory_manager', 'warehouse_staff']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createPartnerSchema.parse(req.body);

    // Check duplicate name
    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM partners WHERE LOWER(name) = LOWER($1)',
      [parsed.name.trim()]
    );
    if (existing) {
      throw new AppError(`A partner named "${parsed.name.trim()}" already exists.`, 409);
    }

    const result = await db.execute(
      `INSERT INTO partners (name, type, contact_name, email, phone, address, tax_id, payment_terms, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        parsed.name.trim(),
        parsed.type,
        parsed.contact_name?.trim() || '',
        parsed.email?.trim() || '',
        parsed.phone?.trim() || '',
        parsed.address?.trim() || '',
        parsed.tax_id?.trim() || '',
        parsed.payment_terms?.trim() || 'Net 30',
        parsed.notes?.trim() || ''
      ]
    );

    const partnerId = result.lastInsertRowid;

    res.status(201).json({
      success: true,
      message: `${parsed.type === 'supplier' ? 'Supplier' : 'Partner'} "${parsed.name.trim()}" added successfully.`,
      data: {
        id: partnerId,
        name: parsed.name.trim(),
        type: parsed.type,
        contact_name: parsed.contact_name?.trim() || '',
        email: parsed.email?.trim() || '',
        phone: parsed.phone?.trim() || '',
        address: parsed.address?.trim() || '',
        tax_id: parsed.tax_id?.trim() || '',
        payment_terms: parsed.payment_terms?.trim() || 'Net 30',
        notes: parsed.notes?.trim() || ''
      }
    });
  })
);

/**
 * PUT /api/v1/partners/:id
 * Update partner details.
 */
partnersRouter.put(
  '/:id',
  authMiddleware,
  requireRole(['admin', 'inventory_manager']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid partner ID', 400);

    const existing = await db.queryOne<any>('SELECT * FROM partners WHERE id = $1', [id]);
    if (!existing) throw new AppError('Partner not found', 404);

    const parsed = updatePartnerSchema.parse(req.body);

    const name = parsed.name !== undefined ? parsed.name.trim() : existing.name;
    const type = parsed.type !== undefined ? parsed.type : existing.type;
    const contactName = parsed.contact_name !== undefined ? parsed.contact_name.trim() : existing.contact_name;
    const email = parsed.email !== undefined ? parsed.email.trim() : existing.email;
    const phone = parsed.phone !== undefined ? parsed.phone.trim() : existing.phone;
    const address = parsed.address !== undefined ? parsed.address.trim() : existing.address;
    const taxId = parsed.tax_id !== undefined ? parsed.tax_id.trim() : existing.tax_id;
    const paymentTerms = parsed.payment_terms !== undefined ? parsed.payment_terms.trim() : existing.payment_terms;
    const notes = parsed.notes !== undefined ? parsed.notes.trim() : existing.notes;

    // Check duplicate name on update if changed
    if (parsed.name && parsed.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await db.queryOne<{ id: number }>(
        'SELECT id FROM partners WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, id]
      );
      if (duplicate) {
        throw new AppError(`A partner named "${name}" already exists.`, 409);
      }
    }

    await db.execute(
      `UPDATE partners 
       SET name = $1, type = $2, contact_name = $3, email = $4, phone = $5, address = $6, tax_id = $7, payment_terms = $8, notes = $9
       WHERE id = $10`,
      [name, type, contactName, email, phone, address, taxId, paymentTerms, notes, id]
    );

    res.json({
      success: true,
      message: 'Partner updated successfully.',
      data: {
        id,
        name,
        type,
        contact_name: contactName,
        email,
        phone,
        address,
        tax_id: taxId,
        payment_terms: paymentTerms,
        notes
      }
    });
  })
);

/**
 * DELETE /api/v1/partners/:id
 * Remove a partner.
 */
partnersRouter.delete(
  '/:id',
  authMiddleware,
  requireRole(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) throw new AppError('Invalid partner ID', 400);

    const partner = await db.queryOne<{ name: string }>('SELECT name FROM partners WHERE id = $1', [id]);
    if (!partner) throw new AppError('Partner not found', 404);

    await db.execute('DELETE FROM partners WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Partner "${partner.name}" deleted successfully.`
    });
  })
);
