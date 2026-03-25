import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Hunt } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Search, Crosshair, Calendar, User, Phone, ChevronRight, LogOut, Shield, Star } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import logoImg from "@assets/logo.jpg";

function LLHuntLogo() {
  return (
    <img src={logoImg} alt="LLHUNT Adventures" className="h-10 w-auto rounded-full" />
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const { user, logout, isAdmin } = useAuth();

  const { data: hunts, isLoading } = useQuery<Hunt[]>({
    queryKey: ["/api/hunts"],
  });

  const filtered = hunts?.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.clientName.toLowerCase().includes(q) ||
      h.guideName.toLowerCase().includes(q) ||
      (h.clientPhone && h.clientPhone.includes(search)) ||
      (h.clientEmail && h.clientEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-5 border-b border-border">
        <LLHuntLogo />
        <div className="flex items-center gap-2">
          <Link href="/check-in">
            <Button data-testid="button-new-checkin" size="sm" className="gap-1.5 font-semibold">
              <UserPlus className="h-4 w-4" />
              Check In
            </Button>
          </Link>
        </div>
      </header>

      {/* User bar */}
      <div className="flex items-center justify-between mt-4 py-2 px-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          {isAdmin ? (
            <Shield className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{user?.displayName}</span>
          <Badge variant="outline" className="text-xs">
            {isAdmin ? "Admin" : "Guide"}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground gap-1.5 h-8" data-testid="button-logout">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          placeholder={isAdmin ? "Search by client, guide, phone..." : "Search by client, phone..."}
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats Bar */}
      {!isLoading && hunts && (
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5" />
            {hunts.length} hunt{hunts.length !== 1 ? "s" : ""}{isAdmin ? " total" : ""}
          </span>
        </div>
      )}

      {/* Hunt List */}
      <div className="mt-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-60" />
              </CardContent>
            </Card>
          ))
        ) : filtered && filtered.length > 0 ? (
          filtered.map((hunt) => (
            <Link key={hunt.id} href={`/hunts/${hunt.id}`}>
              <Card
                data-testid={`card-hunt-${hunt.id}`}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate" data-testid={`text-client-${hunt.id}`}>
                        {hunt.clientName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {hunt.guideName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(hunt.huntDateStart), "MMM d, yyyy")}
                          {hunt.huntDateEnd && ` – ${format(new Date(hunt.huntDateEnd), "MMM d")}`}
                        </span>
                        {hunt.clientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {hunt.clientPhone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {hunt.clientState && (
                          <Badge variant="secondary" className="text-xs">
                            {hunt.clientState}
                          </Badge>
                        )}
                        {hunt.clientRating && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= hunt.clientRating!
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/20"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Crosshair className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {search ? "No hunts match your search" : "No hunts recorded yet"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Try a different search term" : "Tap \"Check In\" to log your first client"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
