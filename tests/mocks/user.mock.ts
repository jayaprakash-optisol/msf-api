// Mock user data
export const mockUsers = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'hashed_Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'User' as const,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    email: 'admin@example.com',
    password: 'hashed_Password123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'Admin' as const,
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
  role: 'User' as const,
};
