import { Router } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.router.js';
import { productsRouter } from './products.router.js';
import { warehousesRouter } from './warehouses.router.js';
import { receiptsRouter } from './receipts.router.js';
import { deliveriesRouter } from './deliveries.router.js';
import { transfersRouter } from './transfers.router.js';
import { historyRouter } from './history.router.js';
import { dashboardRouter } from './dashboard.router.js';

const apiV1Router = Router();

apiV1Router.use('/', healthRouter);
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/products', productsRouter);
apiV1Router.use('/warehouses', warehousesRouter);
apiV1Router.use('/receipts', receiptsRouter);
apiV1Router.use('/deliveries', deliveriesRouter);
apiV1Router.use('/transfers', transfersRouter);
apiV1Router.use('/stock-history', historyRouter);
apiV1Router.use('/dashboard', dashboardRouter);

export { apiV1Router };

