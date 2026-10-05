import { Router } from 'express';
import { getParks, getParkById } from '../controllers/parkController';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validators/schemas';

const router = Router();

router.get('/', getParks);
router.get('/:id', validateParams(idParamSchema), getParkById);

export default router;
