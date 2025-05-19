// Mock user data
export const mockUsers = [
  {
    id: 1,
    email: 'test@example.com',
    password: 'hashed_Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 2,
    email: 'admin@example.com',
    password: 'hashed_Password123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin' as const,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
];

// Mock new user data
export const mockNewUser = {
  email: 'new@example.com',
  password: 'Password123!',
  firstName: 'New',
  lastName: 'User',
  role: 'user' as const,
};

// Mock jwt payload
export const mockJwtPayload = {
  id: '1',
  userId: 1,
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
