import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertHuntSchema, insertHarvestSchema } from "@shared/schema";

export function registerRoutes(server: Server, app: Express) {
  // Get all hunts
  app.get("/api/hunts", (_req, res) => {
    const hunts = storage.getHunts();
    res.json(hunts);
  });

  // Search hunts
  app.get("/api/hunts/search", (req, res) => {
    const q = (req.query.q as string) || "";
    const results = storage.searchHunts(q);
    res.json(results);
  });

  // Get single hunt with harvests
  app.get("/api/hunts/:id", (req, res) => {
    const hunt = storage.getHunt(Number(req.params.id));
    if (!hunt) return res.status(404).json({ message: "Hunt not found" });
    const harvests = storage.getHarvestsByHunt(hunt.id);
    res.json({ ...hunt, harvests });
  });

  // Create hunt
  app.post("/api/hunts", (req, res) => {
    const parsed = insertHuntSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const hunt = storage.createHunt(parsed.data);
    res.status(201).json(hunt);
  });

  // Update hunt
  app.patch("/api/hunts/:id", (req, res) => {
    const hunt = storage.updateHunt(Number(req.params.id), req.body);
    if (!hunt) return res.status(404).json({ message: "Hunt not found" });
    res.json(hunt);
  });

  // Delete hunt
  app.delete("/api/hunts/:id", (req, res) => {
    storage.deleteHunt(Number(req.params.id));
    res.status(204).end();
  });

  // Create harvest
  app.post("/api/harvests", (req, res) => {
    const parsed = insertHarvestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const harvest = storage.createHarvest(parsed.data);
    res.status(201).json(harvest);
  });

  // Delete harvest
  app.delete("/api/harvests/:id", (req, res) => {
    storage.deleteHarvest(Number(req.params.id));
    res.status(204).end();
  });
}
