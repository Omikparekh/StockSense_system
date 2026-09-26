import { Router } from 'express';
import { healthRouter } from './health.router.js';

const apiV1Router = Router();

apiV1Router.use('/', healthRouter);

export { apiV1Router };
