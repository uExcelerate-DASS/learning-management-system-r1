import { Router, RequestHandler } from 'express';
import { login, register, validateToken } from '../controllers/authController';

const router = Router();

router.post('/login', login as RequestHandler);
router.post('/register', register as RequestHandler);
router.post('/validate', validateToken as RequestHandler);

export default router;