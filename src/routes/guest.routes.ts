import { Router } from 'express';
import { GuestController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateCreateGuest,
  validateUpdateGuest,
  validateGuestQuery,
  validateConfirmGuestCredentials,
} from '../validators/guest.validator';

const router = Router();
const guestController = new GuestController();

router.post('/', authenticate, validateCreateGuest, guestController.createGuest);
router.post(
  '/:id/confirm-credentials',
  authenticate,
  validateConfirmGuestCredentials,
  guestController.confirmGuestCredentials,
);
router.get('/', authenticate, validateGuestQuery, guestController.getAllGuests);
router.get('/:id/credentials', authenticate, guestController.getGuestCredentials);
router.get('/:id', authenticate, guestController.getGuestById);
router.put('/:id', authenticate, validateUpdateGuest, guestController.updateGuest);
router.delete('/:id', authenticate, guestController.deleteGuest);

export default router;
