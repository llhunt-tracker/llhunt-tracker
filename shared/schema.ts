import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(), // "admin" or "guide"
});

export const hunts = sqliteTable("hunts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientState: text("client_state"),
  guideName: text("guide_name").notNull(),
  guideUserId: integer("guide_user_id"),
  huntDateStart: text("hunt_date_start").notNull(),
  huntDateEnd: text("hunt_date_end"),
  notes: text("notes"),
  clientRating: integer("client_rating"), // 1-5 stars
  createdAt: text("created_at").notNull(),
});

export const harvests = sqliteTable("harvests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  huntId: integer("hunt_id").notNull(),
  animal: text("animal").notNull(),
  antlerSize: text("antler_size"),
  harvestDate: text("harvest_date").notNull(),
  notes: text("notes"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertHuntSchema = createInsertSchema(hunts).omit({ id: true });
export const insertHarvestSchema = createInsertSchema(harvests).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHunt = z.infer<typeof insertHuntSchema>;
export type Hunt = typeof hunts.$inferSelect;
export type InsertHarvest = z.infer<typeof insertHarvestSchema>;
export type Harvest = typeof harvests.$inferSelect;
