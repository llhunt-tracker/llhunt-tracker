import { hunts, harvests, type Hunt, type Harvest, type InsertHunt, type InsertHarvest } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

export interface IStorage {
  getHunts(): Hunt[];
  getHunt(id: number): Hunt | undefined;
  createHunt(hunt: InsertHunt): Hunt;
  updateHunt(id: number, hunt: Partial<InsertHunt>): Hunt | undefined;
  deleteHunt(id: number): void;
  getHarvestsByHunt(huntId: number): Harvest[];
  createHarvest(harvest: InsertHarvest): Harvest;
  deleteHarvest(id: number): void;
  searchHunts(query: string): Hunt[];
}

export class DatabaseStorage implements IStorage {
  getHunts(): Hunt[] {
    return db.select().from(hunts).orderBy(desc(hunts.createdAt)).all();
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
    // Delete associated harvests first
    db.delete(harvests).where(eq(harvests.huntId, id)).run();
    db.delete(hunts).where(eq(hunts.id, id)).run();
  }

  getHarvestsByHunt(huntId: number): Harvest[] {
    return db.select().from(harvests).where(eq(harvests.huntId, huntId)).all();
  }

  createHarvest(harvest: InsertHarvest): Harvest {
    return db.insert(harvests).values(harvest).returning().get();
  }

  deleteHarvest(id: number): void {
    db.delete(harvests).where(eq(harvests.id, id)).run();
  }

  searchHunts(query: string): Hunt[] {
    const allHunts = this.getHunts();
    const lowerQuery = query.toLowerCase();
    return allHunts.filter(
      (h) =>
        h.clientName.toLowerCase().includes(lowerQuery) ||
        (h.clientPhone && h.clientPhone.includes(query)) ||
        (h.clientEmail && h.clientEmail.toLowerCase().includes(lowerQuery)) ||
        h.guideName.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new DatabaseStorage();
