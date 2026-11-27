
import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { authorize } from '../middlewares/authorize.ts';

const auditLogRouter = Router();
const auditLogController = new AuditLogController();

// Riwayat audit hanya dapat dibaca oleh admin.
// Tidak tersedia endpoint untuk mengubah atau menghapus audit.
auditLogRouter.use(authenticate, authorize('admin'));

auditLogRouter.get('/', auditLogController.getAll);
auditLogRouter.get('/:id', auditLogController.getById);

export { auditLogRouter };
