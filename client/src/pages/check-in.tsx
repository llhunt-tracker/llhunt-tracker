import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { US_STATES } from "@/lib/constants";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  clientPhone: z.string().optional(),
  clientState: z.string().optional(),
  guideName: z.string().optional(),
  guideUserId: z.number().optional(),
  huntDateStart: z.string().min(1, "Start date is required"),
  huntDateEnd: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type UserInfo = { id: number; username: string; displayName: string; role: string };

export default function CheckIn() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Admin can pick guide from user list
  const { data: allUsers } = useQuery<UserInfo[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const guideUsers = allUsers?.filter(u => u.role === "guide" || u.role === "admin") || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientState: "",
      guideName: isAdmin ? "" : user?.displayName || "",
      guideUserId: isAdmin ? undefined : user?.id,
      huntDateStart: new Date().toISOString().split("T")[0],
      huntDateEnd: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: any = {
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        clientState: data.clientState || null,
        huntDateStart: data.huntDateStart,
        huntDateEnd: data.huntDateEnd || null,
        notes: data.notes || null,
        createdAt: new Date().toISOString(),
      };

      if (isAdmin && data.guideUserId) {
        payload.guideUserId = data.guideUserId;
        payload.guideName = data.guideName;
      }

      const res = await apiRequest("POST", "/api/hunts", payload);
      return res.json();
    },
    onSuccess: (hunt) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hunts"] });
      toast({ title: "Client checked in", description: `${hunt.clientName} has been registered.` });
      setLocation(`/hunts/${hunt.id}`);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to check in client.", variant: "destructive" });
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate(data);
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
        <h1 className="font-semibold text-lg">Client Check-In</h1>
      </header>

      <Card className="mt-5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-5 w-5 text-primary" />
            New Hunt Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Client Name */}
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input data-testid="input-client-name" placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input data-testid="input-phone" placeholder="(555) 123-4567" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input data-testid="input-email" placeholder="john@email.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* State */}
              <FormField
                control={form.control}
                name="clientState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Guide - only shown to admin */}
              {isAdmin ? (
                <FormField
                  control={form.control}
                  name="guideUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Guide *</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          const selectedUser = guideUsers.find(u => u.id === Number(v));
                          field.onChange(Number(v));
                          if (selectedUser) {
                            form.setValue("guideName", selectedUser.displayName);
                          }
                        }}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-guide">
                            <SelectValue placeholder="Select guide" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {guideUsers.map((g) => (
                            <SelectItem key={g.id} value={g.id.toString()}>
                              {g.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">Guide: </span>
                  <span className="font-medium">{user?.displayName}</span>
                  <span className="text-muted-foreground ml-1">(auto-assigned)</span>
                </div>
              )}

              {/* Hunt Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="huntDateStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hunt Start Date *</FormLabel>
                      <FormControl>
                        <Input data-testid="input-date-start" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="huntDateEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hunt End Date</FormLabel>
                      <FormControl>
                        <Input data-testid="input-date-end" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-notes"
                        placeholder="Special requests, medical info, etc."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                data-testid="button-submit"
                type="submit"
                className="w-full font-semibold"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Checking in..." : "Check In Client"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
