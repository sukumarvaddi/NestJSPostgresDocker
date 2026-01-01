import { PrismaClient } from '../generated/prisma/client.js';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: adapter });

const main = async () => {
  console.log('🌱 Starting seed...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing');
  try {
    // Test database connection
    await db.$connect();
    console.log('✅ Database connected successfully');

    // Clear existing data (in correct order due to foreign keys)
    console.log('🧹 Cleaning existing data...');
    const deletedOrders = await db.order.deleteMany();
    const deletedProducts = await db.product.deleteMany();
    const deletedUsers = await db.user.deleteMany();
    console.log(`Deleted: ${deletedUsers.count} users, ${deletedProducts.count} products, ${deletedOrders.count} orders`);

    // Create users FIRST (since orders reference users)
    console.log('👤 Creating users...');
    const users = await Promise.all(
      Array.from({ length: 5 }).map(async () => {
        const created = await db.user.create({
          data: {
            email: faker.internet.email(),
            name: faker.person.fullName(),
            address: faker.location.streetAddress(),
            roles: ['user'],
          },
        });
        console.log(`Created user: ${created.email}`);
        return created;
      })
    );

    // Create products
    console.log('📦 Creating products...');
    const products = await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        const created = await db.product.create({
          data: {
            name: faker.commerce.productName(),
            price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
          },
        });
        console.log(`Created product: ${created.name}`);
        return created;
      })
    );

    // Create orders LAST (after users exist)
    console.log('🛍️ Creating orders...');
    await Promise.all(
      Array.from({ length: 15 }).map(async () => {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomProducts = faker.helpers.arrayElements(products, { min: 1, max: 3 });

        const created = await db.order.create({
          data: {
            total: faker.number.float({ min: 20, max: 500, fractionDigits: 2 }),
            userId: randomUser.id,
            stripeInvoiceId: faker.string.alphanumeric(24),
            products: {
              connect: randomProducts.map(product => ({ id: product.id }))
            }
          },
        });
        console.log(`Created order: ${created.id} for user ${created.userId}`);
        return created;
      })
    );

    // Verify data was inserted
    const userCount = await db.user.count();
    const productCount = await db.product.count();
    const orderCount = await db.order.count();

    console.log(`✅ Final counts: ${userCount} users, ${productCount} products, ${orderCount} orders`);
    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('💥 Seed failed:', error);
    throw error;
  }
};
// ...existing code...

main()
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('🔌 Disconnecting from database...');
    await db.$disconnect();
  });