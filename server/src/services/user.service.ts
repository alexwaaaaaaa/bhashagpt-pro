import * as bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { jwtService } from './jwt.service';

// Define types based on Prisma schema
type User = {
  id: string;
  email: string;
  password: string;
  name: string | null;
  avatar: string | null;
  subscriptionTier: string;
  preferredLanguage: string;
  timezone: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Subscription = {
  id: string;
  userId: string;
  planType: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  expiresAt: Date | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  language?: string;
  timezone?: string;
}

export interface UpdateUserData {
  name?: string;
  avatar?: string;
  language?: string;
  timezone?: string;
}

export interface UserWithSubscription extends User {
  subscription?: Subscription | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export class UserService {
  private db: typeof prisma;

  constructor() {
    this.db = prisma;
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.db.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await this.db.user.create({
        data: {
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          name: userData.name,
          preferredLanguage: userData.language || 'en',
          timezone: userData.timezone,
        },
      });

      logger.info('User created successfully', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      logger.error('Error creating user', { error, email: userData.email });
      throw error;
    }
  }

  /**
   * Authenticate user and return tokens
   */
  async loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.db.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
        include: { subscriptions: true },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Determine user role based on subscription
      let role = 'user';
      const activeSubscription = user.subscriptions?.find(sub => sub.status === 'ACTIVE');
      if (activeSubscription) {
        role = activeSubscription.planType === 'PRO' ? 'pro' : 'user';
      }

      // Generate tokens
      const tokens = await jwtService.generateTokens({
        id: user.id,
        userId: user.id,
        email: user.email,
        role,
      });

      // Update last login
      await this.db.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      logger.error('Error logging in user', { error, email: credentials.email });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithSubscription | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        include: { subscriptions: true },
      });

      return user;
    } catch (error) {
      logger.error('Error getting user by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserWithSubscription | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { subscriptions: true },
      });

      return user;
    } catch (error) {
      logger.error('Error getting user by email', { error, email });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(updateData),
      });

      return user;
    } catch (error) {
      logger.error('Error updating user', { error, userId });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get user with password
      const user = await this.db.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.db.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      });

      // Invalidate all existing tokens
      await jwtService.invalidateUserTokens(userId);

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Error changing password', { error, userId });
      throw error;
    }
  }

  /**
   * Delete user account (GDPR compliance)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Start transaction
      await this.db.$transaction(async (tx) => {
        // Delete user's chat sessions and messages
        await tx.message.deleteMany({
          where: {
            session: {
              userId,
            },
          },
        });

        await tx.chatSession.deleteMany({
          where: { userId },
        });

        // Delete user's usage tracking
        // Remove user usage tracking data if needed
        // await tx.usageTracking.deleteMany({
        //   where: { userId },
        // });

        // Delete user's sessions
        await tx.session.deleteMany({
          where: { userId },
        });

        // Delete subscription (if exists)
        await tx.subscription.deleteMany({
          where: { userId },
        });

        // Finally delete the user
        await tx.user.delete({
          where: { id: userId },
        });
      });

      // Invalidate all tokens
      await jwtService.invalidateUserTokens(userId);

      logger.info('User deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user', { error, userId });
      throw error;
    }
  }

  /**
   * Get user's public profile (without sensitive data)
   */
  async getPublicProfile(userId: string): Promise<any | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          avatar: true,
          preferredLanguage: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      logger.error('Error getting public profile', { error, userId });
      throw error;
    }
  }

  /**
   * Search users (admin only)
   */
  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.db.user.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            preferredLanguage: true,
            timezone: true,
            createdAt: true,
            updatedAt: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.db.user.count({
          where: {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
        }),
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error searching users', { error, query });
      throw error;
    }
  }

  /**
   * Verify password for sensitive operations
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error('Error verifying password', { error, userId });
      return false;
    }
  }
}

export const userService = new UserService();