import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuestController } from '../../src/controllers/guest.controller';
import { GuestService } from '../../src/services/guest.service';
import { mockGuests, mockNewGuest, mockGuestCredentialsConfirmation } from '../mocks';
import { StatusCodes } from 'http-status-codes';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { BadRequestError, NotFoundError } from '../../src/utils/error.util';

// Mock the asyncHandler middleware
vi.mock('../../src/middleware/async.middleware', () => ({
  asyncHandler: vi.fn(fn => {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }),
}));

// Mock the service layer
vi.mock('../../src/services/guest.service', () => {
  const guestServiceMock = {
    createGuest: vi.fn(),
    confirmGuestCredentials: vi.fn(),
    getGuestCredentials: vi.fn(),
    getAllGuests: vi.fn(),
    getGuestById: vi.fn(),
    updateGuest: vi.fn(),
    deleteGuest: vi.fn(),
  };

  return {
    GuestService: {
      getInstance: vi.fn(() => guestServiceMock),
    },
  };
});

describe('GuestController', () => {
  let controller: GuestController;
  let guestService: any;

  beforeEach(() => {
    vi.resetAllMocks();
    guestService = GuestService.getInstance();
    controller = new GuestController();
  });

  describe('createGuest', () => {
    it('should create a guest successfully', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewGuest });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.createGuest.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.CREATED,
        data: { id: '00000000-0000-0000-0000-000000000003', ...mockNewGuest },
        message: 'Guest created successfully',
      });

      // Call the controller method
      await controller.createGuest(req, res, next);

      // Verify service was called with correct data
      expect(guestService.createGuest).toHaveBeenCalledWith(mockNewGuest);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if guest creation fails', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewGuest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.createGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Guest with this info already exists',
      });

      // Call the controller method
      await controller.createGuest(req, res, next);

      // Verify BadRequestError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Guest with this info already exists');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewGuest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.createGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.createGuest(req, res, next);

      // Verify BadRequestError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Guest creation failed');
    });

    it('should handle unexpected errors', async () => {
      // Setup mocks
      const req = createMockRequest({ body: mockNewGuest });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service to throw error
      guestService.createGuest.mockRejectedValueOnce(new Error('Unexpected error'));

      // Call the controller method
      await controller.createGuest(req, res, next);

      // Verify next was called with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('confirmGuestCredentials', () => {
    it('should confirm guest credentials successfully', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: mockGuestCredentialsConfirmation,
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.confirmGuestCredentials.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: { confirmed: true },
        message: 'Credentials confirmed successfully',
      });

      // Call the controller method
      await controller.confirmGuestCredentials(req, res, next);

      // Verify service was called with correct data
      expect(guestService.confirmGuestCredentials).toHaveBeenCalledWith(
        guestId,
        mockGuestCredentialsConfirmation,
      );

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if confirmation fails', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: mockGuestCredentialsConfirmation,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.confirmGuestCredentials.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.BAD_REQUEST,
        error: 'Invalid credentials',
      });

      // Call the controller method
      await controller.confirmGuestCredentials(req, res, next);

      // Verify BadRequestError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Invalid credentials');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: mockGuestCredentialsConfirmation,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.confirmGuestCredentials.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.confirmGuestCredentials(req, res, next);

      // Verify BadRequestError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to confirm credentials');
    });
  });

  describe('getGuestCredentials', () => {
    it('should get guest credentials successfully', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestCredentials.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: {
          username: 'john.doe1234',
          password: 'JoDo5678',
        },
        message: 'Credentials can only be viewed once',
      });

      // Call the controller method
      await controller.getGuestCredentials(req, res, next);

      // Verify service was called with correct ID
      expect(guestService.getGuestCredentials).toHaveBeenCalledWith(guestId);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if retrieving credentials fails', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestCredentials.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'Credentials already viewed',
      });

      // Call the controller method
      await controller.getGuestCredentials(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Credentials already viewed');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestCredentials.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.getGuestCredentials(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to get guest credentials');
    });
  });

  describe('getAllGuests', () => {
    it('should get all guests with default pagination', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getAllGuests.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: {
          items: mockGuests,
          total: mockGuests.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        message: 'Guests retrieved successfully',
      });

      // Call the controller method
      await controller.getAllGuests(req, res, next);

      // Verify service was called with correct parameters
      expect(guestService.getAllGuests).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        search: undefined,
      });

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should get all guests with custom parameters', async () => {
      // Setup mocks
      const req = createMockRequest({
        query: {
          page: '2',
          limit: '5',
          status: 'Active',
          search: 'John',
        },
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getAllGuests.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: {
          items: [mockGuests[0]],
          total: 1,
          page: 2,
          limit: 5,
          totalPages: 1,
        },
        message: 'Guests retrieved successfully',
      });

      // Call the controller method
      await controller.getAllGuests(req, res, next);

      // Verify service was called with correct parameters
      expect(guestService.getAllGuests).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        status: 'Active',
        search: 'John',
      });

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if retrieval fails', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getAllGuests.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: 'Database error',
      });

      // Call the controller method
      await controller.getAllGuests(req, res, next);

      // Verify BadRequestError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Database error');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const req = createMockRequest({ query: {} });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getAllGuests.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.getAllGuests(req, res, next);

      // Verify BadRequestError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
      expect(next.mock.calls[0][0].message).toBe('Failed to retrieve guests');
    });
  });

  describe('getGuestById', () => {
    it('should get guest by ID successfully', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestById.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: mockGuests[0],
        message: 'Guest found',
      });

      // Call the controller method
      await controller.getGuestById(req, res, next);

      // Verify service was called with correct ID
      expect(guestService.getGuestById).toHaveBeenCalledWith(guestId);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if guest not found', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000099';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestById.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'Guest not found',
      });

      // Call the controller method
      await controller.getGuestById(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Guest not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.getGuestById.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.getGuestById(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Guest not found');
    });
  });

  describe('updateGuest', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Guest',
      role: 'Stock Manager' as const,
      status: 'Inactive' as const,
    };

    it('should update a guest successfully', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: updateData,
      });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.updateGuest.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        data: { ...mockGuests[0], ...updateData },
        message: 'Guest updated successfully',
      });

      // Call the controller method
      await controller.updateGuest(req, res, next);

      // Verify service was called with correct data
      expect(guestService.updateGuest).toHaveBeenCalledWith(guestId, updateData);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if guest update fails', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.updateGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'Guest not found',
      });

      // Call the controller method
      await controller.updateGuest(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Guest not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({
        params: { id: guestId },
        body: updateData,
      });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.updateGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.updateGuest(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to update guest');
    });
  });

  describe('deleteGuest', () => {
    it('should delete a guest successfully', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res, jsonSpy } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.deleteGuest.mockResolvedValueOnce({
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Guest deleted successfully',
      });

      // Call the controller method
      await controller.deleteGuest(req, res, next);

      // Verify service was called with correct ID
      expect(guestService.deleteGuest).toHaveBeenCalledWith(guestId);

      // Verify response
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('should return error if guest deletion fails', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.deleteGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.NOT_FOUND,
        error: 'Guest not found',
      });

      // Call the controller method
      await controller.deleteGuest(req, res, next);

      // Verify NotFoundError was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Guest not found');
    });

    it('should return default error message if error is undefined', async () => {
      // Setup mocks
      const guestId = '00000000-0000-0000-0000-000000000001';
      const req = createMockRequest({ params: { id: guestId } });
      const { res } = createMockResponse();
      const next = createMockNext();

      // Mock service response
      guestService.deleteGuest.mockResolvedValueOnce({
        success: false,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        error: undefined,
      });

      // Call the controller method
      await controller.deleteGuest(req, res, next);

      // Verify NotFoundError with default message was passed to next
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(next.mock.calls[0][0].message).toBe('Failed to delete guest');
    });
  });
});
