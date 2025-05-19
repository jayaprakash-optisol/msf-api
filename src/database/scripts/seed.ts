import bcrypt from 'bcrypt';

import { db, initDatabaseConnection } from '../../config/database.config';
import env from '../../config/env.config';
import { users, guests } from '../../models';
import { logger } from '../../utils/logger';

// Hash password function
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, parseInt(env.BCRYPT_SALT_ROUNDS.toString(), 10));
};

// Insert sample users
async function seedUsers() {
  try {
    const hashedPassword = await hashPassword('Password123!');

    await db.insert(users).values([
      {
        email: 'admin@yopmail.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'Admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'user@yopmail.com',
        password: hashedPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    logger.info('✅ Users seeded successfully');
  } catch (error) {
    logger.error('❌ Error seeding users:', error);
    throw error;
  }
}

// Insert sample guests
async function seedGuests() {
  try {
    const hashedPassword = await hashPassword('GuestPass123!');
    await db.insert(guests).values([
      {
        firstName: 'Lincoln',
        lastName: 'Burrows',
        location: 'Warehouse A',
        role: 'Stock Manager',
        accessPeriod: '1 week',
        username: 'Lincoln.Burrows1',
        password: hashedPassword,
        status: 'Active',
        credentialsViewed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        firstName: 'Michael',
        lastName: 'Scofield',
        location: 'Store B',
        role: 'Store Keeper',
        accessPeriod: '2 days',
        username: 'Michael.Scofield1',
        password: hashedPassword,
        status: 'Inactive',
        credentialsViewed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    logger.info('🌱 Guests seeded successfully');
  } catch (error) {
    logger.error('❌ Error seeding guests:', error);
    throw error;
  }
}

async function seed() {
  try {
    logger.info('✅ Starting database seeding...');
    await initDatabaseConnection();

    await seedUsers();
    await seedGuests();

    logger.info('🌱 Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
