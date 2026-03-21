import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const hunts = sqliteTable("hunts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientState: text("client_state"),
  guideName: text("guide_name").notNull(),
  huntDateStart: text("hunt_date_start").notNull(),
  huntDateEnd: text("hunt_date_end"),
  notes: text("notes"),
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

export const insertHuntSchema = createInsertSchema(hunts).omit({ id: true });
export const insertHarvestSchema = createInsertSchema(harvests).omit({ id: true });

export type InsertHunt = z.infer<typeof insertHuntSchema>;
export type Hunt = typeof hunts.$inferSelect;
export type InsertHarvest = z.infer<typeof insertHarvestSchema>;
export type Harvest = typeof harvests.$inferSelect;
