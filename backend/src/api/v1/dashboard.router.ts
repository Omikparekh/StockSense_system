import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { db } from '../../config/database.js';

const dashboardRouter = Router();

export interface DashboardKPIs {
  receipts: {
    to_receive: number;
    late: number;
    today: number;
    done: number;
  };
  deliveries: {
    to_deliver: number;
    late: number;
    waiting: number;
    ready: number;
    done: number;
  };
  transfers: {
    in_progress: number;
    done: number;
  };
  inventory: {
    total_products: number;
    total_units: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  recent_operations: any[];
  recent_stock_moves: any[];
}

/**
 * GET /api/v1/dashboard/kpis
 * Fetch operational dashboard metrics, status counters, and real-time activity stream.
 */
dashboardRouter.get(
  '/kpis',
  authMiddleware,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Inbound Receipts counts
    const receiptsAll = await db.query<any>(
      "SELECT scheduled_date, status FROM operations WHERE operation_type = 'IN'"
    );
    let receiptsToReceive = 0;
    let receiptsLate = 0;
    let receiptsToday = 0;
    let receiptsDone = 0;

    for (const r of receiptsAll) {
      if (r.status === 'Done') {
        receiptsDone++;
      } else {
        receiptsToReceive++;
        if (r.scheduled_date && r.scheduled_date < todayStr) {
          receiptsLate++;
        }
        if (r.scheduled_date && r.scheduled_date === todayStr) {
          receiptsToday++;
        }
      }
    }

    // 2. Outbound Deliveries counts
    const deliveriesAll = await db.query<any>(
      "SELECT scheduled_date, status FROM operations WHERE operation_type = 'OUT'"
    );
    let deliveriesToDeliver = 0;
    let deliveriesLate = 0;
    let deliveriesWaiting = 0;
    let deliveriesReady = 0;
    let deliveriesDone = 0;

    for (const d of deliveriesAll) {
      if (d.status === 'Done') {
        deliveriesDone++;
      } else {
        deliveriesToDeliver++;
        if (d.status === 'Waiting') deliveriesWaiting++;
        if (d.status === 'Ready') deliveriesReady++;
        if (d.scheduled_date && d.scheduled_date < todayStr) {
          deliveriesLate++;
        }
      }
    }

    // 3. Internal Transfers counts
    const transfersAll = await db.query<any>(
      "SELECT status FROM operations WHERE operation_type = 'INT'"
    );
    let transfersInProgress = 0;
    let transfersDone = 0;
    for (const t of transfersAll) {
      if (t.status === 'Done') {
        transfersDone++;
      } else {
        transfersInProgress++;
      }
    }

    // 4. Inventory Health & Totals
    const productStats = await db.query<any>(`
      SELECT 
        p.id,
        p.reorder_level,
        COALESCE(SUM(s.on_hand), 0) AS total_on_hand
      FROM products p
      LEFT JOIN stock_levels s ON p.id = s.product_id
      GROUP BY p.id, p.reorder_level
    `);

    let totalProducts = productStats.length;
    let totalUnits = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of productStats) {
      const onHand = Number(p.total_on_hand) || 0;
      const reorderLevel = Number(p.reorder_level) || 0;
      totalUnits += onHand;

      if (onHand <= 0) {
        outOfStockCount++;
      } else if (onHand <= reorderLevel) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    // 5. Recent 5 Operations
    const recentOperations = await db.query<any>(`
      SELECT 
        op.id,
        op.reference,
        op.operation_type,
        op.partner_name,
        op.scheduled_date,
        op.status,
        w.name AS warehouse_name
      FROM operations op
      LEFT JOIN warehouses w ON op.warehouse_id = w.id
      ORDER BY op.id DESC
      LIMIT 5
    `);

    // 6. Recent 5 Stock Moves (Ledger)
    const recentStockMoves = await db.query<any>(`
      SELECT 
        h.id,
        h.reference,
        h.operation_type,
        h.quantity,
        h.from_location,
        h.to_location,
        h.created_at,
        p.name AS product_name,
        p.sku,
        p.uom
      FROM stock_history h
      LEFT JOIN products p ON h.product_id = p.id
      ORDER BY h.id DESC
      LIMIT 5
    `);

    const kpis: DashboardKPIs = {
      receipts: {
        to_receive: receiptsToReceive,
        late: receiptsLate,
        today: receiptsToday,
        done: receiptsDone
      },
      deliveries: {
        to_deliver: deliveriesToDeliver,
        late: deliveriesLate,
        waiting: deliveriesWaiting,
        ready: deliveriesReady,
        done: deliveriesDone
      },
      transfers: {
        in_progress: transfersInProgress,
        done: transfersDone
      },
      inventory: {
        total_products: totalProducts,
        total_units: Math.round(totalUnits * 100) / 100,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount
      },
      recent_operations: recentOperations,
      recent_stock_moves: recentStockMoves
    };

    res.json({
      success: true,
      data: kpis
    });
  })
);

export { dashboardRouter };
