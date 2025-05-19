import { type guests } from '../models';
import { type PaginationParams, type ServiceResponse } from './common.interface';

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

export interface GuestListResponse extends PaginationParams {
  guests: Omit<Guest, 'password'>[];
  total: number;
  totalPages: number;
}

export interface IGuestService {
  createGuest(
    guestData: Omit<NewGuest, 'id' | 'createdAt' | 'updatedAt' | 'credentialsViewed'> & {
      generateCredentials: boolean;
    },
  ): Promise<
    ServiceResponse<{ guest: Omit<Guest, 'password'>; username?: string; password?: string }>
  >;

  confirmGuestCredentials(
    guestId: string,
    credentials: { username: string; password: string },
  ): Promise<ServiceResponse<void>>;

  getGuestById(guestId: string): Promise<ServiceResponse<Omit<Guest, 'password'>>>;

  getGuestCredentials(
    guestId: string,
  ): Promise<ServiceResponse<{ username: string; password: string }>>;

  getAllGuests(
    pagination: PaginationParams & { status?: string; search?: string },
  ): Promise<ServiceResponse<GuestListResponse>>;

  updateGuest(
    guestId: string,
    guestData: Partial<
      Omit<Guest, 'id' | 'username' | 'createdAt' | 'updatedAt' | 'credentialsViewed'>
    >,
  ): Promise<ServiceResponse<Omit<Guest, 'password'>>>;

  deleteGuest(guestId: string): Promise<ServiceResponse<void>>;
}
