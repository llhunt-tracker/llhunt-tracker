import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertHuntSchema, insertHarvestSchema } from "@shared/schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Simple token-based auth: token = base64(userId:hash)
function createToken(userId: number): string {
  const payload = `${userId}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

function parseToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const userId = parseInt(decoded.split(":")[0]);
    return isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}

async function getUser(req: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const userId = parseToken(auth.slice(7));
  if (!userId) return null;
  return storage.getUserById(userId);
}

async function requireAuth(req: any, res: any) {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ message: "Not logged in" });
    return null;
  }
  return user;
}

export async function registerRoutes(server: Server, app: Express) {
  // Seed default users if none exist
  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length === 0) {
    // Admin account
    await storage.createUser({
      username: "lendell",
      password: hashPassword("llhunt2026"),
      displayName: "Lendell L.",
      role: "admin",
    });
    // Guide accounts
    const guides = [
      { username: "bryan", displayName: "Bryan L." },
      { username: "braylin", displayName: "Braylin L." },
      { username: "chance", displayName: "Chance S." },
      { username: "blaine", displayName: "Blaine J." },
      { username: "jason", displayName: "Jason K." },
      { username: "cole", displayName: "Cole K." },
      { username: "mike", displayName: "Mike P." },
    ];
    for (const g of guides) {
      await storage.createUser({
        username: g.username,
        password: hashPassword("hunt2026"),
        displayName: g.displayName,
        role: "guide",
      });
    }
    console.log("Default users seeded");
  }

  // ---- AUTH ----
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });
    
    const user = await storage.getUserByUsername(username.toLowerCase().trim());
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    
    const token = createToken(user.id);
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } });
  });

  app.get("/api/me", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  });

  // ---- HUNTS ----
  app.get("/api/hunts", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    // Admin sees all, guides see only their own
    const huntList = user.role === "admin" ? await storage.getHunts() : await storage.getHuntsByGuide(user.id);
    res.json(huntList);
  });

  app.get("/api/hunts/search", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    const q = (req.query.q as string) || "";
    const results = await storage.searchHunts(q, user.role === "admin" ? undefined : user.id);
    res.json(results);
  });

  app.get("/api/hunts/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    const hunt = await storage.getHunt(Number(req.params.id));
    if (!hunt) return res.status(404).json({ message: "Hunt not found" });
    
    // Guides can only see their own hunts
    if (user.role !== "admin" && hunt.guideUserId !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const harvestList = await storage.getHarvestsByHunt(hunt.id);
    res.json({ ...hunt, harvests: harvestList });
  });

  app.post("/api/hunts", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    const body = {
      ...req.body,
      guideUserId: user.role === "admin" ? (req.body.guideUserId || null) : user.id,
      guideName: user.role === "admin" ? req.body.guideName : user.displayName,
    };
    
    const parsed = insertHuntSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const hunt = await storage.createHunt(parsed.data);
    res.status(201).json(hunt);
  });

  app.patch("/api/hunts/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    const existing = await storage.getHunt(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Hunt not found" });
    if (user.role !== "admin" && existing.guideUserId !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const hunt = await storage.updateHunt(Number(req.params.id), req.body);
    res.json(hunt);
  });

  app.delete("/api/hunts/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    const existing = await storage.getHunt(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Hunt not found" });
    
    // Only admin can delete
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete hunts" });
    }
    
    await storage.deleteHunt(Number(req.params.id));
    res.status(204).end();
  });

  // ---- HARVESTS ----
  app.post("/api/harvests", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    // Verify the hunt belongs to this guide (or user is admin)
    const hunt = await storage.getHunt(req.body.huntId);
    if (!hunt) return res.status(404).json({ message: "Hunt not found" });
    if (user.role !== "admin" && hunt.guideUserId !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    const parsed = insertHarvestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const harvest = await storage.createHarvest(parsed.data);
    res.status(201).json(harvest);
  });

  app.delete("/api/harvests/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    
    // Only admin can delete harvests
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete harvests" });
    }
    
    await storage.deleteHarvest(Number(req.params.id));
    res.status(204).end();
  });

  // ---- ADMIN: manage guides ----
  app.get("/api/users", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    
    const allUsers = (await storage.getAllUsers()).map(u => ({
      id: u.id, username: u.username, displayName: u.displayName, role: u.role
    }));
    res.json(allUsers);
  });
}
