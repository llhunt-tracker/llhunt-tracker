import { users, hunts, harvests, type User, type Hunt, type Harvest, type InsertUser, type InsertHunt, type InsertHarvest } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, and } from "drizzle-orm";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com") ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool);

export interface IStorage {
  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Hunts
  getHunts(): Promise<Hunt[]>;
  getHuntsByGuide(guideUserId: number): Promise<Hunt[]>;
  getHunt(id: number): Promise<Hunt | undefined>;
  createHunt(hunt: InsertHunt): Promise<Hunt>;
  updateHunt(id: number, hunt: Partial<InsertHunt>): Promise<Hunt | undefined>;
  deleteHunt(id: number): Promise<void>;
  
  // Harvests
  getHarvestsByHunt(huntId: number): Promise<Harvest[]>;
  createHarvest(harvest: InsertHarvest): Promise<Harvest>;
  deleteHarvest(id: number): Promise<void>;
  
  // Search
  searchHunts(query: string, guideUserId?: number): Promise<Hunt[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(user).returning();
    return rows[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Hunts
  async getHunts(): Promise<Hunt[]> {
    return db.select().from(hunts).orderBy(desc(hunts.createdAt));
  }

  async getHuntsByGuide(guideUserId: number): Promise<Hunt[]> {
    return db.select().from(hunts).where(eq(hunts.guideUserId, guideUserId)).orderBy(desc(hunts.createdAt));
  }

  async getHunt(id: number): Promise<Hunt | undefined> {
    const rows = await db.select().from(hunts).where(eq(hunts.id, id));
    return rows[0];
  }

  async createHunt(hunt: InsertHunt): Promise<Hunt> {
    const rows = await db.insert(hunts).values(hunt).returning();
    return rows[0];
  }

  async updateHunt(id: number, data: Partial<InsertHunt>): Promise<Hunt | undefined> {
    const rows = await db.update(hunts).set(data).where(eq(hunts.id, id)).returning();
    return rows[0];
  }

  async deleteHunt(id: number): Promise<void> {
    await db.delete(harvests).where(eq(harvests.huntId, id));
    await db.delete(hunts).where(eq(hunts.id, id));
  }

  // Harvests
  async getHarvestsByHunt(huntId: number): Promise<Harvest[]> {
    return db.select().from(harvests).where(eq(harvests.huntId, huntId));
  }

  async createHarvest(harvest: InsertHarvest): Promise<Harvest> {
    const rows = await db.insert(harvests).values(harvest).returning();
    return rows[0];
  }

  async deleteHarvest(id: number): Promise<void> {
    await db.delete(harvests).where(eq(harvests.id, id));
  }

  // Search
  async searchHunts(query: string, guideUserId?: number): Promise<Hunt[]> {
    const baseHunts = guideUserId ? await this.getHuntsByGuide(guideUserId) : await this.getHunts();
    const lowerQuery = query.toLowerCase();
    return baseHunts.filter(
      (h) =>
        h.clientName.toLowerCase().includes(lowerQuery) ||
        (h.clientPhone && h.clientPhone.includes(query)) ||
        (h.clientEmail && h.clientEmail.toLowerCase().includes(lowerQuery)) ||
        h.guideName.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new DatabaseStorage();
