import { type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async.middleware';
import { GuestService } from '../services';
import { type IGuestService } from '../types';
import { sendSuccess, BadRequestError, NotFoundError, guestResponse } from '../utils';

export class GuestController {
  private readonly guestService: IGuestService;

  constructor() {
    this.guestService = GuestService.getInstance();
  }

  /**
   * Create a new guest
   */
  createGuest = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.guestService.createGuest(req.body);
    if (!result.success)
      throw new BadRequestError(result.error ?? guestResponse.errors.creationFailed);
    sendSuccess(res, result.data, guestResponse.success.created);
  });

  /**
   * Get guest credentials
   */
  getGuestCredentials = asyncHandler(async (req: Request, res: Response) => {
    const guestId = req.params.id;
    const result = await this.guestService.getGuestCredentials(guestId);
    if (!result.success)
      throw new NotFoundError(result.error ?? guestResponse.errors.credentialsFailed);
    sendSuccess(res, result.data, guestResponse.success.credentialsViewMessage);
  });

  /**
   * Get all guests
   */
  getAllGuests = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, search } = req.query;
    const result = await this.guestService.getAllGuests({
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      status: status as string,
      search: search as string,
    });
    if (!result.success) throw new BadRequestError(result.error ?? guestResponse.errors.listFailed);
    sendSuccess(res, result.data);
  });

  /**
   * Get guest by ID
   */
  getGuestById = asyncHandler(async (req: Request, res: Response) => {
    const guestId = req.params.id;
    const result = await this.guestService.getGuestById(guestId);
    if (!result.success) throw new NotFoundError(result.error ?? guestResponse.errors.notFound);
    sendSuccess(res, result.data);
  });

  /**
   * Update guest
   */
  updateGuest = asyncHandler(async (req: Request, res: Response) => {
    const guestId = req.params.id;
    const result = await this.guestService.updateGuest(guestId, req.body);
    if (!result.success) throw new NotFoundError(result.error ?? guestResponse.errors.updateFailed);
    sendSuccess(res, result.data, guestResponse.success.updated);
  });

  /**
   * Delete guest
   */
  deleteGuest = asyncHandler(async (req: Request, res: Response) => {
    const guestId = req.params.id;
    const result = await this.guestService.deleteGuest(guestId);
    if (!result.success) throw new NotFoundError(result.error ?? guestResponse.errors.deleteFailed);
    sendSuccess(res, undefined, guestResponse.success.deleted);
  });
}
