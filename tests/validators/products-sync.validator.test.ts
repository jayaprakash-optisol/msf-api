import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import {
  validateManualSync,
  validateResetLastUpdate,
} from '../../src/validators/products-sync.validator';
import { createMockRequest, createMockResponse, createMockNext } from '../utils/test-utils';
import { ValidationError } from '../../src/utils/error.util';

describe('Products Sync Validators', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    req = createMockRequest() as Request;
    const mockRes = createMockResponse();
    res = mockRes.res;
    next = createMockNext();
  });

  describe('validateManualSync', () => {
    it('should pass validation with valid boolean resetLastUpdate', () => {
      req.body = { resetLastUpdate: true };

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with false resetLastUpdate', () => {
      req.body = { resetLastUpdate: false };

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with empty body (optional field)', () => {
      req.body = {};

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with undefined resetLastUpdate', () => {
      req.body = { resetLastUpdate: undefined };

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation with invalid resetLastUpdate type', () => {
      req.body = { resetLastUpdate: 'true' };

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('resetLastUpdate');
      expect(error.message).toContain('Expected boolean');
    });

    it('should fail validation with invalid resetLastUpdate value', () => {
      req.body = { resetLastUpdate: 123 };

      validateManualSync(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('resetLastUpdate');
    });
  });

  describe('validateResetLastUpdate', () => {
    it('should pass validation with valid daysAgo', () => {
      req.body = { daysAgo: 30 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with minimum daysAgo (1)', () => {
      req.body = { daysAgo: 1 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with maximum daysAgo (365)', () => {
      req.body = { daysAgo: 365 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass validation with empty body (optional field with default)', () => {
      req.body = {};

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail validation with daysAgo less than 1', () => {
      req.body = { daysAgo: 0 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('daysAgo must be at least 1');
    });

    it('should fail validation with negative daysAgo', () => {
      req.body = { daysAgo: -5 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('daysAgo must be at least 1');
    });

    it('should fail validation with daysAgo greater than 365', () => {
      req.body = { daysAgo: 366 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('daysAgo cannot exceed 365 days');
    });

    it('should fail validation with non-integer daysAgo', () => {
      req.body = { daysAgo: 7.5 };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('Expected integer');
    });

    it('should fail validation with string daysAgo', () => {
      req.body = { daysAgo: '7' };

      validateResetLastUpdate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error = next.mock.calls[0][0] as ValidationError;
      expect(error.message).toContain('Expected number');
    });
  });
});
