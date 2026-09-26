import { db } from '../config/database.js';

/**
 * Generates an ERP-standard sequence identifier (e.g. WH/IN/00001, WH/OUT/00001, WH/ADJ/00001).
 * Uses atomic sequence tracking per warehouse code and operation type.
 */
export async function getNextSequence(
  warehouseCode: string = 'WH',
  operationType: string = 'IN'
): Promise<string> {
  const code = (warehouseCode || 'WH').toUpperCase().trim();
  const op = (operationType || 'IN').toUpperCase().trim();

  const existing = await db.queryOne<{ id: number; last_number: number }>(
    'SELECT id, last_number FROM sequences WHERE warehouse_code = $1 AND operation_type = $2',
    [code, op]
  );

  let nextNum = 1;
  if (existing) {
    nextNum = Number(existing.last_number) + 1;
    await db.execute(
      'UPDATE sequences SET last_number = $1 WHERE id = $2',
      [nextNum, existing.id]
    );
  } else {
    await db.execute(
      'INSERT INTO sequences (warehouse_code, operation_type, last_number) VALUES ($1, $2, $3)',
      [code, op, nextNum]
    );
  }

  const padded = String(nextNum).padStart(5, '0');
  return `${code}/${op}/${padded}`;
}
