import { Router } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.router.js';
import { productsRouter } from './products.router.js';
import { warehousesRouter } from './warehouses.router.js';
import { receiptsRouter } from './receipts.router.js';
import { deliveriesRouter } from './deliveries.router.js';

const apiV1Router = Router();

apiV1Router.use('/', healthRouter);
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/products', productsRouter);
apiV1Router.use('/warehouses', warehousesRouter);
apiV1Router.use('/receipts', receiptsRouter);
apiV1Router.use('/deliveries', deliveriesRouter);

export { apiV1Router };
