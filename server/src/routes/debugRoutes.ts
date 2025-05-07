import { Router, Response, Request, NextFunction } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.json({ message: "Debugging endpoint" });
});

export default router;
