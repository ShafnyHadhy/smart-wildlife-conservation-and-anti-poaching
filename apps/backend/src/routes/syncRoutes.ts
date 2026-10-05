import { Router } from 'express';
import { syncBatch } from '../controllers/syncController';
import { validateBody } from '../middleware/validate';
import { batchSyncSchema } from '../validators/schemas';

const router = Router();

router.post('/batch', validateBody(batchSyncSchema), syncBatch);

export default router;
