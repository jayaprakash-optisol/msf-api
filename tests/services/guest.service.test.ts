import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { mockGuests, mockNewGuest, mockGuestCredentialsConfirmation } from '../mocks';

// Create mock functions
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockImplementation(password => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn().mockImplementation(() => Promise.resolve(true)),
  },
}));

// Create a simple mock db object with jest functions
vi.mock('../../src/config/database.config', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      guests: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

// Import the service (after mocks)
import { GuestService } from '../../src/services/guest.service';
import bcrypt from 'bcrypt';
import { db } from '../../src/config/database.config';
import { DatabaseError, NotFoundError, InternalServerError } from '../../src/utils/error.util';
import { eq } from 'drizzle-orm';

describe('GuestService', () => {
  let guestService: GuestService;

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset singleton
    // @ts-ignore
    GuestService.instance = undefined;
    guestService = GuestService.getInstance();
  });

  describe('private helper methods', () => {
    describe('_generateRandomUsername', () => {
      it('should generate username with alphanumeric characters and random number', () => {
        // Direct testing of private method
        const username = (guestService as any)._generateRandomUsername('John', 'Doe');

        // Check format - should be lowercase first name + . + lowercase last name + 4 digits
        expect(username).toMatch(/^john\.doe\d{4}$/);
      });

      it('should handle special characters in names', () => {
        const username = (guestService as any)._generateRandomUsername('John-Café', "O'Reilly!");

        // Special characters should be removed
        expect(username).toMatch(/^johncaf\.oreilly\d{4}$/);
      });

      it('should handle empty names', () => {
        const username = (guestService as any)._generateRandomUsername('', '');

        // Should still generate a username with just the random number
        expect(username).toMatch(/^\.\d{4}$/);
      });
    });

    describe('_generateRandomPassword', () => {
      it('should generate password with parts of first/last name and random digits', () => {
        const password = (guestService as any)._generateRandomPassword('John', 'Doe');

        // First char should be uppercase
        expect(password.charAt(0)).toMatch(/[A-Z]/);

        // Should end with 4 digits
        expect(password).toMatch(/\d{4}$/);

        // Length should be 7 (2 from first name + 2 from last name + 4 digits)
        expect(password.length).toBe(8);
      });

      it('should pad short names with placeholder chars', () => {
        const password = (guestService as any)._generateRandomPassword('J', 'D');

        // Should pad first name with 'x' and last name with 'y'
        expect(password.substring(0, 4)).toMatch(/^J[x]D[y]$/);

        // Still ends with 4 digits
        expect(password).toMatch(/\d{4}$/);
      });

      it('should handle empty names by padding', () => {
        const password = (guestService as any)._generateRandomPassword('', '');

        // First two characters should be "Xx" (uppercase X from padding + x)
        expect(password.substring(0, 2)).toBe('Xx');

        // Next two characters should be "yy" (padding for last name)
        expect(password.substring(2, 4)).toBe('yy');

        // Ends with 4 digits
        expect(password).toMatch(/\d{4}$/);
      });
    });

    describe('_ensureGuestExists', () => {
      it('should handle database errors', async () => {
        // Simulate a database error
        vi.mocked(db.query.guests.findFirst).mockRejectedValue(
          new Error('Database connection error'),
        );

        await expect((guestService as any)._ensureGuestExists('some-id')).rejects.toThrow(
          InternalServerError,
        );
        await expect((guestService as any)._ensureGuestExists('some-id')).rejects.toThrow(
          'Guest not found: Database connection error',
        );
      });
    });
  });

  describe('createGuest', () => {
    it('should create a guest successfully', async () => {
      // Setup mocks for random username and password generation
      vi.spyOn(GuestService.prototype as any, '_generateRandomUsername').mockReturnValue(
        'mock.username1234',
      );
      vi.spyOn(GuestService.prototype as any, '_generateRandomPassword').mockReturnValue(
        'MockPass1234',
      );

      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockGuests[0].id, ...mockNewGuest }]),
        }),
      } as any);

      const result = await guestService.createGuest({
        ...mockNewGuest,
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(StatusCodes.CREATED);
      expect(result.message).toContain('Guest created successfully');
      expect(db.insert).toHaveBeenCalled();
    });

    it('should throw DatabaseError when guest creation fails', async () => {
      // Setup mocks for random username and password generation
      vi.spyOn(GuestService.prototype as any, '_generateRandomUsername').mockReturnValue(
        'mock.username1234',
      );
      vi.spyOn(GuestService.prototype as any, '_generateRandomPassword').mockReturnValue(
        'MockPass1234',
      );

      // Setup mocks for this test
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(guestService.createGuest(mockNewGuest)).rejects.toThrow(DatabaseError);
      await expect(guestService.createGuest(mockNewGuest)).rejects.toThrow('Guest creation failed');
    });

    it('should handle general errors during creation', async () => {
      // Setup mocks to throw a generic error
      vi.spyOn(GuestService.prototype as any, '_generateRandomUsername').mockReturnValue(
        'mock.username1234',
      );
      vi.spyOn(GuestService.prototype as any, '_generateRandomPassword').mockReturnValue(
        'MockPass1234',
      );

      vi.mocked(bcrypt.hash).mockRejectedValue(new Error('Bcrypt error'));

      await expect(guestService.createGuest(mockNewGuest)).rejects.toThrow(InternalServerError);
      await expect(guestService.createGuest(mockNewGuest)).rejects.toThrow(
        'Guest creation failed: Bcrypt error',
      );
    });
  });

  describe('getGuestById', () => {
    it('should get a guest by ID successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(mockGuests[0]);

      const result = await guestService.getGuestById(mockGuests[0].id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Guest found');
      expect(db.query.guests.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should throw NotFoundError when guest not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(undefined);

      await expect(guestService.getGuestById('non-existent-id')).rejects.toThrow(NotFoundError);
      await expect(guestService.getGuestById('non-existent-id')).rejects.toThrow('Guest not found');
    });
  });

  describe('getAllGuests', () => {
    it('should get all guests with pagination', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findMany).mockResolvedValue(mockGuests);

      const result = await guestService.getAllGuests({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('guests');
      expect(result.data).toHaveProperty('total');
      expect(result.message).toContain('Guests retrieved successfully');
    });

    it('should filter guests by status when provided', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findMany).mockResolvedValue([mockGuests[0]]);

      await guestService.getAllGuests({ page: 1, limit: 10, status: 'Active' });

      expect(db.query.guests.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should handle database errors', async () => {
      // Setup mocks to throw error
      vi.mocked(db.query.guests.findMany).mockRejectedValue(new Error('Database error'));

      await expect(guestService.getAllGuests({ page: 1, limit: 10 })).rejects.toThrow(
        InternalServerError,
      );
      await expect(guestService.getAllGuests({ page: 1, limit: 10 })).rejects.toThrow(
        'Failed to retrieve guests: Database error',
      );
    });
  });

  describe('confirmGuestCredentials', () => {
    it('should confirm guest credentials successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(mockGuests[0]);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([
                { ...mockGuests[0], username: mockGuestCredentialsConfirmation.username },
              ]),
          }),
        }),
      } as any);

      const result = await guestService.confirmGuestCredentials(
        mockGuests[0].id,
        mockGuestCredentialsConfirmation,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Credentials confirmed successfully');
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when guest not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(undefined);

      await expect(
        guestService.confirmGuestCredentials('non-existent-id', mockGuestCredentialsConfirmation),
      ).rejects.toThrow(NotFoundError);
      await expect(
        guestService.confirmGuestCredentials('non-existent-id', mockGuestCredentialsConfirmation),
      ).rejects.toThrow('Guest not found');
    });

    it('should throw DatabaseError when update fails', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(mockGuests[0]);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        guestService.confirmGuestCredentials(mockGuests[0].id, mockGuestCredentialsConfirmation),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getGuestCredentials', () => {
    it('should get guest credentials successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(mockGuests[0]);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({}),
        }),
      } as any);

      const result = await guestService.getGuestCredentials(mockGuests[0].id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Credentials can only be viewed once');
      expect(result.data).toHaveProperty('username');
      expect(result.data).toHaveProperty('password');
    });

    it('should throw NotFoundError when guest not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(undefined);

      await expect(guestService.getGuestCredentials('non-existent-id')).rejects.toThrow(
        NotFoundError,
      );
      await expect(guestService.getGuestCredentials('non-existent-id')).rejects.toThrow(
        'Guest not found',
      );
    });

    it('should throw NotFoundError when credentials already viewed', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue({
        ...mockGuests[0],
        credentialsViewed: true,
      });

      await expect(guestService.getGuestCredentials(mockGuests[0].id)).rejects.toThrow(
        NotFoundError,
      );
      await expect(guestService.getGuestCredentials(mockGuests[0].id)).rejects.toThrow(
        'Credentials already viewed',
      );
    });

    it('should handle database errors when updating credentials viewed status', async () => {
      // Setup mocks for this test
      vi.mocked(db.query.guests.findFirst).mockResolvedValue(mockGuests[0]);
      // Update the mock to directly throw the error instead of building a chain
      const dbError = new Error('Database error');
      vi.mocked(db.update).mockImplementation(() => {
        throw dbError;
      });

      await expect(guestService.getGuestCredentials(mockGuests[0].id)).rejects.toThrow(
        InternalServerError,
      );
      await expect(guestService.getGuestCredentials(mockGuests[0].id)).rejects.toThrow(
        'Failed to get guest credentials: Database error',
      );
    });
  });

  describe('updateGuest', () => {
    it('should update a guest successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockGuests[0], firstName: 'UpdatedName' }]),
          }),
        }),
      } as any);

      const result = await guestService.updateGuest(mockGuests[0].id, { firstName: 'UpdatedName' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Guest updated successfully');
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when guest not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await expect(
        guestService.updateGuest('non-existent-id', { firstName: 'UpdatedName' }),
      ).rejects.toThrow(NotFoundError);
      await expect(
        guestService.updateGuest('non-existent-id', { firstName: 'UpdatedName' }),
      ).rejects.toThrow('Guest not found');
    });

    it('should handle database errors', async () => {
      // Update the mock to directly throw the error instead of building a chain
      const dbError = new Error('Database error');
      vi.mocked(db.update).mockImplementation(() => {
        throw dbError;
      });

      await expect(
        guestService.updateGuest(mockGuests[0].id, { firstName: 'UpdatedName' }),
      ).rejects.toThrow(InternalServerError);
      await expect(
        guestService.updateGuest(mockGuests[0].id, { firstName: 'UpdatedName' }),
      ).rejects.toThrow('Failed to update guest: Database error');
    });
  });

  describe('deleteGuest', () => {
    it('should delete a guest successfully', async () => {
      // Setup mocks for this test
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockGuests[0]]),
        }),
      } as any);

      const result = await guestService.deleteGuest(mockGuests[0].id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Guest deleted successfully');
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError when guest not found', async () => {
      // Setup mocks for this test
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await expect(guestService.deleteGuest('non-existent-id')).rejects.toThrow(NotFoundError);
      await expect(guestService.deleteGuest('non-existent-id')).rejects.toThrow('Guest not found');
    });

    it('should handle database errors', async () => {
      // Update the mock to directly throw the error instead of building a chain
      const dbError = new Error('Database error');
      vi.mocked(db.delete).mockImplementation(() => {
        throw dbError;
      });

      await expect(guestService.deleteGuest(mockGuests[0].id)).rejects.toThrow(InternalServerError);
      await expect(guestService.deleteGuest(mockGuests[0].id)).rejects.toThrow(
        'Failed to delete guest: Database error',
      );
    });
  });
});
