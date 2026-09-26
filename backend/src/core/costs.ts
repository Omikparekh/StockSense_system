/**
 * Standard product category approximate cost definitions.
 * Used when an explicit actual unit cost has not been configured.
 */
export function getApproximateCost(category: string): number {
  switch (category) {
    case 'Machinery':
      return 210.00;
    case 'Furniture':
      return 120.00;
    case 'Raw Materials':
      return 45.50;
    case 'Hardware':
      return 8.50;
    case 'Packaging':
      return 4.25;
    case 'Electronics & Sensors':
    case 'Electronics':
      return 85.00;
    default:
      return 25.00;
  }
}
