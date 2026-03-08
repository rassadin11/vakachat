import 'dotenv/config'
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";

// The connection string is read from the environment variable (e.g., DATABASE_URL)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Pass the adapter to the PrismaClient constructor
export const prisma = new PrismaClient({ adapter });
