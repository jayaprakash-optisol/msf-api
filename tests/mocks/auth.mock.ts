// Mock jwt payload
export const mockJwtPayload = {
  id: '1',
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  role: 'user' as const,
};

// Mock tokens
export const mockToken = 'mock_token';
export const invalidToken = 'invalid_token';

// Mock auth headers
export const mockAuthHeaders = {
  Authorization: `Bearer ${mockToken}`,
};

// Mock requests
export const mockRegisterRequest = {
  email: 'new@example.com',
  password: 'Password123!',
  firstName: 'New',
  lastName: 'User',
  role: 'user' as const,
};

export const mockLoginRequest = {
  email: 'test@example.com',
  password: 'Password123!',
};
