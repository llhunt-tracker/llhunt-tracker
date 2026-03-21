import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Hunt, Harvest } from "@shared/schema";
import { ANIMALS, ANIMALS_WITH_SIZE } from "@/lib/constants";
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
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type HuntWithHarvests = Hunt & { harvests: Harvest[] };

export default function HuntDetail() {
  const [, params] = useRoute("/hunts/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [harvestAnimal, setHarvestAnimal] = useState("");
  const [harvestSize, setHarvestSize] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  const [harvestNotes, setHarvestNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const huntId = params?.id ? Number(params.id) : 0;

  const { data: hunt, isLoading } = useQuery<HuntWithHarvests>({
    queryKey: ["/api/hunts", huntId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hunts/${huntId}`);
      return res.json();
    },
    enabled: huntId > 0,
  });

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

  const showSizeField = (ANIMALS_WITH_SIZE as readonly string[]).includes(harvestAnimal);

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
      </header>

      {/* Client Info Card */}
      <Card className="mt-5">
        <CardContent className="p-4 space-y-3">
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
