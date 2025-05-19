import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { StatusCodes } from 'http-status-codes';
import { db } from '../config/database.config';
import { guests } from '../models';
import crypto from 'crypto';
import {
  type Guest,
  type NewGuest,
  type IGuestService,
  type GuestListResponse,
  type ServiceResponse,
  type PaginationParams,
} from '../types';
import {
  DatabaseError,
  NotFoundError,
  _ok,
  handleServiceError,
  buildPaginationAndFilters,
  buildWhereClause,
  guestResponse,
} from '../utils';

export class GuestService implements IGuestService {
  private static instance: GuestService;
  private constructor() {}
  public static getInstance(): GuestService {
    if (!GuestService.instance) GuestService.instance = new GuestService();
    return GuestService.instance;
  }

  /**
   * Generate a random username for a guest
   * @param firstName - The first name of the guest
   * @param lastName - The last name of the guest
   * @returns A random username for the guest
   */
  private _generateRandomUsername(firstName: string, lastName: string): string {
    // Generate a cryptographically secure random number between 1000-9999
    const rand = 1000 + (crypto.randomBytes(2).readUInt16BE(0) % 9000);
    return (
      firstName.toLowerCase().replace(/[^a-z0-9]/g, '') +
      '.' +
      lastName.toLowerCase().replace(/[^a-z0-9]/g, '') +
      rand
    );
  }

  /**
   * Generate a random password for a guest
   * @param firstName - The first name of the guest
   * @param lastName - The last name of the guest
   * @returns A random password for the guest
   */
  private _generateRandomPassword(firstName: string, lastName: string): string {
    // Get first 2 characters from first name (or pad with 'x' if too short)
    const firstNameChars = (firstName.substring(0, 2) + 'xx').substring(0, 2);

    // Get first 2 characters from last name (or pad with 'y' if too short)
    const lastNameChars = (lastName.substring(0, 2) + 'yy').substring(0, 2);

    // Add 4 cryptographically secure random digits
    const randomDigits = 1000 + (crypto.randomBytes(2).readUInt16BE(0) % 9000);

    // Combine and ensure at least one uppercase letter
    return (
      firstNameChars.charAt(0).toUpperCase() +
      firstNameChars.charAt(1) +
      lastNameChars +
      randomDigits
    );
  }

  /**
   * Ensure a guest exists
   * @param guestId - The id of the guest
   * @returns A service response containing the guest
   */
  async _ensureGuestExists(guestId: string): Promise<Guest> {
    try {
      const guest = await db.query.guests.findFirst({ where: eq(guests.id, guestId) });
      if (!guest) throw new NotFoundError(guestResponse.errors.notFound);
      return guest;
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.notFound);
    }
  }

  /**
   * Create a new guest
   * @param guestData - The data of the guest to create
   * @returns A service response containing the guest and the generated credentials
   */
  async createGuest(
    guestData: Omit<NewGuest, 'id' | 'createdAt' | 'updatedAt' | 'credentialsViewed'> & {
      generateCredentials: boolean;
    },
  ): Promise<
    ServiceResponse<{ guest: Omit<Guest, 'password'>; username?: string; password?: string }>
  > {
    try {
      const username = this._generateRandomUsername(guestData.firstName, guestData.lastName);
      const password = this._generateRandomPassword(guestData.firstName, guestData.lastName);

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db
        .insert(guests)
        .values({ ...guestData, username, password: hashedPassword })
        .returning();
      if (!result.length) throw new DatabaseError(guestResponse.errors.creationFailed);

      const { password: _, ...guestWithoutPassword } = result[0];
      return _ok(
        {
          guest: guestWithoutPassword,
          username: username,
          password: password,
        },
        guestResponse.success.created,
        StatusCodes.CREATED,
      );
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.creationFailed);
    }
  }

  /**
   * Confirm guest credentials
   * @param guestId - The id of the guest
   * @param credentials - The credentials of the guest
   * @returns A Confirmation message
   */
  async confirmGuestCredentials(
    guestId: string,
    credentials: { username: string; password: string },
  ): Promise<ServiceResponse<void>> {
    try {
      await this._ensureGuestExists(guestId);
      const { password, username } = credentials;

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await db
        .update(guests)
        .set({ password: hashedPassword, username, updatedAt: new Date() })
        .where(eq(guests.id, guestId))
        .returning();
      if (!result.length) throw new NotFoundError(guestResponse.errors.notFound);
      return _ok(undefined, guestResponse.success.credentialsConfirmed);
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.credentialsConfirmationFailed);
    }
  }

  /**
   * Get guest credentials
   * @param guestId - The id of the guest
   * @returns A service response containing the guest credentials
   */
  async getGuestCredentials(
    guestId: string,
  ): Promise<ServiceResponse<{ username: string; password: string }>> {
    try {
      const guest = await this._ensureGuestExists(guestId);
      if (guest.credentialsViewed)
        throw new NotFoundError(guestResponse.errors.credentialsAlreadyViewed);
      await db.update(guests).set({ credentialsViewed: true }).where(eq(guests.id, guestId));
      return _ok(
        { username: guest.username, password: guest.password },
        guestResponse.success.credentialsViewed,
      );
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.credentialsFailed);
    }
  }

  /**
   * Get all guests
   * @param params - The pagination and filter parameters
   * @returns A service response containing the guests
   */
  async getAllGuests(
    params: PaginationParams & { status?: string; search?: string },
  ): Promise<ServiceResponse<GuestListResponse>> {
    try {
      const { offset, limit, page, status, search } = buildPaginationAndFilters(
        params as Record<string, unknown>,
      );
      const whereClause = buildWhereClause(
        { status, search },
        { status: guests.status, search: [guests.firstName, guests.lastName, guests.username] },
      );
      const allGuests = await db.query.guests.findMany({ where: whereClause });
      const total = allGuests.length;

      // Remove password from each guest
      const guestsWithoutPasswords = allGuests.map(guest => {
        const { password: _, ...guestWithoutPassword } = guest;
        return guestWithoutPassword;
      });

      const result = guestsWithoutPasswords.slice(offset, offset + limit);
      const totalPages = Math.ceil(total / limit);

      return _ok(
        { guests: result, total, page, limit, totalPages },
        guestResponse.success.retrieved,
      );
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.listFailed);
    }
  }

  /**
   * Get a guest by id
   * @param guestId - The id of the guest
   * @returns A service response containing the guest
   */
  async getGuestById(guestId: string): Promise<ServiceResponse<Omit<Guest, 'password'>>> {
    try {
      const guest = await this._ensureGuestExists(guestId);
      const { password: _, ...guestWithoutPassword } = guest;
      return _ok(guestWithoutPassword, guestResponse.success.found);
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.notFound);
    }
  }

  /**
   * Update a guest
   * @param guestId - The id of the guest
   * @param guestData - The data of the guest to update
   * @returns A service response containing the updated guest
   */
  async updateGuest(
    guestId: string,
    guestData: Partial<
      Omit<Guest, 'id' | 'username' | 'createdAt' | 'updatedAt' | 'credentialsViewed'>
    >,
  ): Promise<ServiceResponse<Omit<Guest, 'password'>>> {
    try {
      const result = await db
        .update(guests)
        .set({ ...guestData, updatedAt: new Date() })
        .where(eq(guests.id, guestId))
        .returning();
      if (!result.length) throw new NotFoundError(guestResponse.errors.notFound);
      const { password: _, ...guestWithoutPassword } = result[0];
      return _ok(guestWithoutPassword, guestResponse.success.updated);
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.updateFailed);
    }
  }

  /**
   * Delete a guest
   * @param guestId - The id of the guest
   * @returns A service response containing the deleted guest
   */
  async deleteGuest(guestId: string): Promise<ServiceResponse<void>> {
    try {
      const result = await db.delete(guests).where(eq(guests.id, guestId)).returning();
      if (!result.length) throw new NotFoundError(guestResponse.errors.notFound);
      return _ok(undefined, guestResponse.success.deleted);
    } catch (error) {
      throw handleServiceError(error, guestResponse.errors.deleteFailed);
    }
  }
}
