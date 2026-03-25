import { users, hunts, harvests, type User, type Hunt, type Harvest, type InsertUser, type InsertHunt, type InsertHarvest } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";

import path from "path";
import fs from "fs";

// Use persistent disk on Render if available, otherwise local
const renderDisk = "/opt/render/project/src/data";
let dbDir = ".";
if (fs.existsSync(renderDisk)) {
  dbDir = renderDisk;
  console.log(`Using persistent disk at ${renderDisk}`);
}
const dbPath = path.join(dbDir, "data.db");
console.log(`Database path: ${dbPath}`);
const sqlite = new Database(dbPath);

// Create tables if they don't exist (needed for fresh persistent disk)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS hunts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_state TEXT,
    guide_name TEXT NOT NULL,
    guide_user_id INTEGER,
    hunt_date_start TEXT NOT NULL,
    hunt_date_end TEXT,
    notes TEXT,
    client_rating INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS harvests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hunt_id INTEGER NOT NULL,
    animal TEXT NOT NULL,
    antler_size TEXT,
    harvest_date TEXT NOT NULL,
    notes TEXT
  );
`);

const db = drizzle(sqlite);

export interface IStorage {
  // Users
  getUserByUsername(username: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(user: InsertUser): User;
  getAllUsers(): User[];
  
  // Hunts
  getHunts(): Hunt[];
  getHuntsByGuide(guideUserId: number): Hunt[];
  getHunt(id: number): Hunt | undefined;
  createHunt(hunt: InsertHunt): Hunt;
  updateHunt(id: number, hunt: Partial<InsertHunt>): Hunt | undefined;
  deleteHunt(id: number): void;
  
  // Harvests
  getHarvestsByHunt(huntId: number): Harvest[];
  createHarvest(harvest: InsertHarvest): Harvest;
  deleteHarvest(id: number): void;
  
  // Search
  searchHunts(query: string, guideUserId?: number): Hunt[];
}

export class DatabaseStorage implements IStorage {
  // Users
  getUserByUsername(username: string): User | undefined {
    return db.select().from(users).where(eq(users.username, username)).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }

  getAllUsers(): User[] {
    return db.select().from(users).all();
  }

  // Hunts
  getHunts(): Hunt[] {
    return db.select().from(hunts).orderBy(desc(hunts.createdAt)).all();
  }

  getHuntsByGuide(guideUserId: number): Hunt[] {
    return db.select().from(hunts).where(eq(hunts.guideUserId, guideUserId)).orderBy(desc(hunts.createdAt)).all();
  }

  getHunt(id: number): Hunt | undefined {
    return db.select().from(hunts).where(eq(hunts.id, id)).get();
  }

  createHunt(hunt: InsertHunt): Hunt {
    return db.insert(hunts).values(hunt).returning().get();
  }

  updateHunt(id: number, data: Partial<InsertHunt>): Hunt | undefined {
    return db.update(hunts).set(data).where(eq(hunts.id, id)).returning().get();
  }

  deleteHunt(id: number): void {
    db.delete(harvests).where(eq(harvests.huntId, id)).run();
    db.delete(hunts).where(eq(hunts.id, id)).run();
  }

  // Harvests
  getHarvestsByHunt(huntId: number): Harvest[] {
    return db.select().from(harvests).where(eq(harvests.huntId, huntId)).all();
  }

  createHarvest(harvest: InsertHarvest): Harvest {
    return db.insert(harvests).values(harvest).returning().get();
  }

  deleteHarvest(id: number): void {
    db.delete(harvests).where(eq(harvests.id, id)).run();
  }

  // Search
  searchHunts(query: string, guideUserId?: number): Hunt[] {
    const baseHunts = guideUserId ? this.getHuntsByGuide(guideUserId) : this.getHunts();
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
