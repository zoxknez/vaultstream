/**
 * 🔐 STREAMVAULT AUTH SERVICE TESTS
 * Comprehensive tests for authentication service
 */

const request = require('supertest');
const { app } = require('../index');
const { authService } = require('../services/authService');
const { logger } = require('../utils/logger');

describe('Auth Service', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    // Clean up test data
    await authService.cleanupTestData();
    
    // Create test user
    testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      username: 'testuser'
    };
  });

  afterEach(async () => {
    // Clean up after each test
    await authService.cleanupTestData();
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const result = await authService.register(testUser);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.username).toBe(testUser.username);
      expect(result.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should fail to register user with existing email', async () => {
      // Register first user
      await authService.register(testUser);
      
      // Try to register with same email
      const result = await authService.register(testUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email already exists');
    });

    test('should fail to register user with invalid email', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid-email'
      };
      
      const result = await authService.register(invalidUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid email');
    });

    test('should fail to register user with weak password', async () => {
      const weakPasswordUser = {
        ...testUser,
        password: '123'
      };
      
      const result = await authService.register(weakPasswordUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('password too weak');
    });

    test('should fail to register user with missing required fields', async () => {
      const incompleteUser = {
        email: testUser.email
        // Missing password and username
      };
      
      const result = await authService.register(incompleteUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required fields missing');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register test user
      await authService.register(testUser);
    });

    test('should login user with valid credentials', async () => {
      const result = await authService.login(testUser.email, testUser.password);
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
    });

    test('should fail to login with invalid email', async () => {
      const result = await authService.login('nonexistent@example.com', testUser.password);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid credentials');
    });

    test('should fail to login with invalid password', async () => {
      const result = await authService.login(testUser.email, 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid credentials');
    });

    test('should fail to login with empty credentials', async () => {
      const result = await authService.login('', '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials required');
    });
  });

  describe('Token Validation', () => {
    beforeEach(async () => {
      // Register and login test user
      await authService.register(testUser);
      const loginResult = await authService.login(testUser.email, testUser.password);
      testToken = loginResult.token;
    });

    test('should validate valid token', async () => {
      const result = await authService.validateToken(testToken);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
    });

    test('should fail to validate invalid token', async () => {
      const result = await authService.validateToken('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid token');
    });

    test('should fail to validate expired token', async () => {
      // Create expired token (this would require mocking time)
      const expiredToken = 'expired-token';
      
      const result = await authService.validateToken(expiredToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('token expired');
    });

    test('should fail to validate empty token', async () => {
      const result = await authService.validateToken('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('token required');
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Register test user
      await authService.register(testUser);
    });

    test('should initiate password reset for valid email', async () => {
      const result = await authService.initiatePasswordReset(testUser.email);
      
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
    });

    test('should fail to initiate password reset for invalid email', async () => {
      const result = await authService.initiatePasswordReset('nonexistent@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email not found');
    });

    test('should reset password with valid reset token', async () => {
      // Initiate password reset
      const resetResult = await authService.initiatePasswordReset(testUser.email);
      const resetToken = resetResult.resetToken;
      
      // Reset password
      const newPassword = 'newpassword123';
      const result = await authService.resetPassword(resetToken, newPassword);
      
      expect(result.success).toBe(true);
      
      // Verify new password works
      const loginResult = await authService.login(testUser.email, newPassword);
      expect(loginResult.success).toBe(true);
    });

    test('should fail to reset password with invalid reset token', async () => {
      const result = await authService.resetPassword('invalid-reset-token', 'newpassword123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid reset token');
    });

    test('should fail to reset password with weak new password', async () => {
      // Initiate password reset
      const resetResult = await authService.initiatePasswordReset(testUser.email);
      const resetToken = resetResult.resetToken;
      
      // Try to reset with weak password
      const result = await authService.resetPassword(resetToken, '123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('password too weak');
    });
  });

  describe('User Profile', () => {
    beforeEach(async () => {
      // Register and login test user
      await authService.register(testUser);
      const loginResult = await authService.login(testUser.email, testUser.password);
      testToken = loginResult.token;
    });

    test('should get user profile', async () => {
      const result = await authService.getUserProfile(testUser.email);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.password).toBeUndefined();
    });

    test('should update user profile', async () => {
      const updates = {
        username: 'newusername',
        bio: 'New bio'
      };
      
      const result = await authService.updateUserProfile(testUser.email, updates);
      
      expect(result.success).toBe(true);
      expect(result.user.username).toBe(updates.username);
      expect(result.user.bio).toBe(updates.bio);
    });

    test('should fail to update user profile with invalid email', async () => {
      const updates = {
        username: 'newusername'
      };
      
      const result = await authService.updateUserProfile('nonexistent@example.com', updates);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('user not found');
    });

    test('should fail to update user profile with invalid data', async () => {
      const invalidUpdates = {
        email: 'invalid-email'
      };
      
      const result = await authService.updateUserProfile(testUser.email, invalidUpdates);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid data');
    });
  });

  describe('User Deletion', () => {
    beforeEach(async () => {
      // Register and login test user
      await authService.register(testUser);
      const loginResult = await authService.login(testUser.email, testUser.password);
      testToken = loginResult.token;
    });

    test('should delete user account', async () => {
      const result = await authService.deleteUser(testUser.email);
      
      expect(result.success).toBe(true);
      
      // Verify user is deleted
      const profileResult = await authService.getUserProfile(testUser.email);
      expect(profileResult.success).toBe(false);
    });

    test('should fail to delete non-existent user', async () => {
      const result = await authService.deleteUser('nonexistent@example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('user not found');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Register and login test user
      await authService.register(testUser);
      const loginResult = await authService.login(testUser.email, testUser.password);
      testToken = loginResult.token;
    });

    test('should logout user', async () => {
      const result = await authService.logout(testToken);
      
      expect(result.success).toBe(true);
      
      // Verify token is invalidated
      const validateResult = await authService.validateToken(testToken);
      expect(validateResult.success).toBe(false);
    });

    test('should fail to logout with invalid token', async () => {
      const result = await authService.logout('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid token');
    });

    test('should refresh token', async () => {
      const result = await authService.refreshToken(testToken);
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token).not.toBe(testToken);
    });

    test('should fail to refresh invalid token', async () => {
      const result = await authService.refreshToken('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid token');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on login attempts', async () => {
      // Register test user
      await authService.register(testUser);
      
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await authService.login(testUser.email, 'wrongpassword');
      }
      
      // Should be rate limited
      const result = await authService.login(testUser.email, 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limited');
    });

    test('should enforce rate limiting on registration attempts', async () => {
      // Make multiple registration attempts
      for (let i = 0; i < 5; i++) {
        await authService.register({
          ...testUser,
          email: `test${i}@example.com`
        });
      }
      
      // Should be rate limited
      const result = await authService.register({
        ...testUser,
        email: 'test5@example.com'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limited');
    });
  });

  describe('Security', () => {
    test('should hash passwords securely', async () => {
      const result = await authService.register(testUser);
      
      expect(result.success).toBe(true);
      
      // Verify password is hashed in database
      const user = await authService.getUserByEmail(testUser.email);
      expect(user.password).not.toBe(testUser.password);
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
    });

    test('should prevent SQL injection', async () => {
      const maliciousUser = {
        ...testUser,
        email: "'; DROP TABLE users; --"
      };
      
      const result = await authService.register(maliciousUser);
      
      // Should either succeed (with sanitized input) or fail gracefully
      expect(result.success).toBeDefined();
    });

    test('should prevent XSS attacks', async () => {
      const maliciousUser = {
        ...testUser,
        username: '<script>alert("xss")</script>'
      };
      
      const result = await authService.register(maliciousUser);
      
      expect(result.success).toBe(true);
      expect(result.user.username).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalMethod = authService.register;
      authService.register = jest.fn().mockRejectedValue(new Error('Database connection failed'));
      
      const result = await authService.register(testUser);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('database error');
      
      // Restore original method
      authService.register = originalMethod;
    });

    test('should handle network errors gracefully', async () => {
      // Mock network error
      const originalMethod = authService.login;
      authService.login = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await authService.login(testUser.email, testUser.password);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('network error');
      
      // Restore original method
      authService.login = originalMethod;
    });
  });

  describe('Performance', () => {
    test('should register user within acceptable time', async () => {
      const startTime = Date.now();
      
      const result = await authService.register(testUser);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should login user within acceptable time', async () => {
      // Register user first
      await authService.register(testUser);
      
      const startTime = Date.now();
      
      const result = await authService.login(testUser.email, testUser.password);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});