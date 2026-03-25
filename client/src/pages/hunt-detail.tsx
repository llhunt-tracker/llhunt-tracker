import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Hunt, Harvest } from "@shared/schema";
import { ANIMALS, ANIMALS_WITH_SIZE, GUIDES, US_STATES } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Crosshair,
  Pencil,
  Star,
  Check,
  X,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type HuntWithHarvests = Hunt & { harvests: Harvest[] };
type UserInfo = { id: number; username: string; displayName: string; role: string };

function StarRating({ rating, onRate, readonly = false, size = "md" }: { rating: number | null; onRate?: (r: number) => void; readonly?: boolean; size?: "sm" | "md" }) {
  const px = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}`}
          data-testid={`star-${star}`}
        >
          <Star
            className={`${px} ${
              (rating || 0) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function HuntDetail() {
  const [, params] = useRoute("/hunts/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const [harvestAnimal, setHarvestAnimal] = useState("");
  const [harvestSize, setHarvestSize] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [harvestNotes, setHarvestNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const huntId = params?.id ? Number(params.id) : 0;

  const { data: hunt, isLoading } = useQuery<HuntWithHarvests>({
    queryKey: ["/api/hunts", huntId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hunts/${huntId}`);
      return res.json();
    },
    enabled: huntId > 0,
  });

  const { data: allUsers } = useQuery<UserInfo[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const guideUsers = allUsers?.filter(u => u.role === "guide" || u.role === "admin") || [];

  const addHarvest = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/harvests", {
        huntId,
        animal: harvestAnimal,
        antlerSize: harvestSize || null,
        harvestDate,
        notes: harvestNotes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts", huntId] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({ title: "Harvest recorded", description: `${harvestAnimal} added to the log.` });
      setHarvestAnimal("");
      setHarvestSize("");
      setHarvestNotes("");
      setHarvestDate(new Date().toISOString().split("T")[0]);
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add harvest.", variant: "destructive" });
    },
  });

  const removeHarvest = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/harvests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts", huntId] });
      toast({ title: "Harvest removed" });
    },
  });

  const deleteHunt = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/hunts/${huntId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({ title: "Hunt deleted" });
      setLocation("/");
    },
  });

  const updateHunt = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PATCH", `/api/hunts/${huntId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts", huntId] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({ title: "Hunt updated" });
      setEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update hunt.", variant: "destructive" });
    },
  });

  const rateClient = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("PATCH", `/api/hunts/${huntId}`, { clientRating: rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts", huntId] });
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({ title: "Rating saved" });
    },
  });

  function startEditing() {
    if (!hunt) return;
    setEditData({
      clientName: hunt.clientName,
      clientEmail: hunt.clientEmail || "",
      clientPhone: hunt.clientPhone || "",
      clientState: hunt.clientState || "",
      guideName: hunt.guideName,
      guideUserId: hunt.guideUserId,
      huntDateStart: hunt.huntDateStart,
      huntDateEnd: hunt.huntDateEnd || "",
      notes: hunt.notes || "",
    });
    setEditing(true);
  }

  function saveEdit() {
    const payload: Record<string, any> = {
      clientName: editData.clientName,
      clientEmail: editData.clientEmail || null,
      clientPhone: editData.clientPhone || null,
      clientState: editData.clientState || null,
      huntDateStart: editData.huntDateStart,
      huntDateEnd: editData.huntDateEnd || null,
      notes: editData.notes || null,
    };
    if (isAdmin && editData.guideUserId) {
      payload.guideUserId = editData.guideUserId;
      payload.guideName = editData.guideName;
    }
    updateHunt.mutate(payload);
  }

  const showSizeField = (ANIMALS_WITH_SIZE as readonly string[]).includes(harvestAnimal);

  // Can edit if admin, or if guide owns this hunt
  const canEdit = isAdmin || (hunt && hunt.guideUserId === user?.id);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <header className="flex items-center gap-3 py-5 border-b border-border">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-6 w-48" />
        </header>
        <div className="mt-5 space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="max-w-2xl mx-auto px-4 text-center py-20">
        <p className="text-muted-foreground">Hunt not found.</p>
        <Link href="/">
          <Button variant="link" className="mt-2">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 py-5 border-b border-border">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg truncate" data-testid="text-hunt-client">
            {hunt.clientName}
          </h1>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-hunt" className="gap-1.5">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </header>

      {/* Client Info Card */}
      <Card className="mt-5">
        <CardContent className="p-4 space-y-3">
          {editing ? (
            /* ---- EDIT MODE ---- */
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Client Name *</label>
                <Input
                  data-testid="edit-client-name"
                  value={editData.clientName}
                  onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input
                    data-testid="edit-phone"
                    type="tel"
                    value={editData.clientPhone}
                    onChange={(e) => setEditData({ ...editData, clientPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    data-testid="edit-email"
                    type="email"
                    value={editData.clientEmail}
                    onChange={(e) => setEditData({ ...editData, clientEmail: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Home State</label>
                <Select
                  value={editData.clientState}
                  onValueChange={(v) => setEditData({ ...editData, clientState: v })}
                >
                  <SelectTrigger data-testid="edit-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guide selection - admin only */}
              {isAdmin && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Assigned Guide</label>
                  <Select
                    value={editData.guideUserId?.toString() || ""}
                    onValueChange={(v) => {
                      const selected = guideUsers.find(u => u.id === Number(v));
                      setEditData({ ...editData, guideUserId: Number(v), guideName: selected?.displayName || editData.guideName });
                    }}
                  >
                    <SelectTrigger data-testid="edit-guide">
                      <SelectValue placeholder="Select guide" />
                    </SelectTrigger>
                    <SelectContent>
                      {guideUsers.map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>{g.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Hunt Start Date *</label>
                  <Input
                    data-testid="edit-date-start"
                    type="date"
                    value={editData.huntDateStart}
                    onChange={(e) => setEditData({ ...editData, huntDateStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Hunt End Date</label>
                  <Input
                    data-testid="edit-date-end"
                    type="date"
                    value={editData.huntDateEnd}
                    onChange={(e) => setEditData({ ...editData, huntDateEnd: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <Textarea
                  data-testid="edit-notes"
                  rows={3}
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  data-testid="button-save-edit"
                  className="flex-1 font-semibold gap-1.5"
                  onClick={saveEdit}
                  disabled={updateHunt.isPending || !editData.clientName}
                >
                  <Check className="h-4 w-4" />
                  {updateHunt.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  data-testid="button-cancel-edit"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ---- VIEW MODE ---- */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0 text-primary" />
                  <span>Guide: <span className="text-foreground font-medium">{hunt.guideName}</span></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {format(new Date(hunt.huntDateStart), "MMM d, yyyy")}
                    {hunt.huntDateEnd && ` – ${format(new Date(hunt.huntDateEnd), "MMM d, yyyy")}`}
                  </span>
                </div>
                {hunt.clientPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <a href={`tel:${hunt.clientPhone}`} className="text-foreground hover:underline">
                      {hunt.clientPhone}
                    </a>
                  </div>
                )}
                {hunt.clientEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <a href={`mailto:${hunt.clientEmail}`} className="text-foreground hover:underline truncate">
                      {hunt.clientEmail}
                    </a>
                  </div>
                )}
                {hunt.clientState && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{hunt.clientState}</span>
                  </div>
                )}
                {hunt.notes && (
                  <div className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
                    <StickyNote className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span className="text-foreground">{hunt.notes}</span>
                  </div>
                )}
              </div>

              {/* Client Rating */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Client Rating</span>
                  <StarRating
                    rating={hunt.clientRating}
                    onRate={(r) => rateClient.mutate(r)}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Harvest Section */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crosshair className="h-5 w-5 text-primary" />
              Animals Harvested ({hunt.harvests.length})
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-harvest" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Harvest</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Animal *</label>
                    <Select value={harvestAnimal} onValueChange={(v) => { setHarvestAnimal(v); setHarvestSize(""); }}>
                      <SelectTrigger data-testid="select-harvest-animal">
                        <SelectValue placeholder="Select animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANIMALS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showSizeField && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Antler Size (inches)</label>
                      <Input
                        data-testid="input-antler-size"
                        placeholder='e.g. 145 3/8"'
                        value={harvestSize}
                        onChange={(e) => setHarvestSize(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Date Harvested *</label>
                    <Input
                      data-testid="input-harvest-date"
                      type="date"
                      value={harvestDate}
                      onChange={(e) => setHarvestDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notes</label>
                    <Textarea
                      data-testid="input-harvest-notes"
                      placeholder="Shot distance, weapon used, etc."
                      rows={2}
                      value={harvestNotes}
                      onChange={(e) => setHarvestNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    data-testid="button-save-harvest"
                    className="w-full font-semibold"
                    disabled={!harvestAnimal || !harvestDate || addHarvest.isPending}
                    onClick={() => addHarvest.mutate()}
                  >
                    {addHarvest.isPending ? "Saving..." : "Save Harvest"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {hunt.harvests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crosshair className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No animals harvested yet</p>
              <p className="text-xs mt-1">Tap "Add" to record a harvest</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hunt.harvests.map((h) => (
                <div
                  key={h.id}
                  data-testid={`harvest-${h.id}`}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{h.animal}</span>
                      {h.antlerSize && (
                        <Badge variant="outline" className="text-xs">
                          {h.antlerSize}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(h.harvestDate), "MMM d, yyyy")}
                      {h.notes && ` · ${h.notes}`}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      data-testid={`button-delete-harvest-${h.id}`}
                      onClick={() => removeHarvest.mutate(h.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Hunt - Admin only */}
      {isAdmin && (
      <div className="mt-6 flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid="button-delete-hunt">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete This Hunt
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Hunt?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {hunt.clientName}'s hunt record and all harvest data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteHunt.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      )}
    </div>
  );
}
