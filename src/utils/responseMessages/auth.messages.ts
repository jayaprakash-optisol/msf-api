export const authResponse = {
  errors: {
    invalidCredentials: 'Invalid email or password',
    loginFailed: 'Login failed',
    logoutFailed: 'Logout failed',
    refreshTokenFailed: 'Failed to refresh token',
    sessionExpired: 'Session expired',
    unauthorized: 'Unauthorized access',
    accountLocked: 'Account locked due to too many failed attempts',
    tokenInvalid: 'Invalid token',
  },
  success: {
    loggedIn: 'User logged in successfully',
    loggedOut: 'User logged out successfully',
    tokenRefreshed: 'Token refreshed successfully',
  },
};
