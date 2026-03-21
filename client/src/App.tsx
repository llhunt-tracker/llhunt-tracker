import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "./pages/dashboard";
import CheckIn from "./pages/check-in";
import HuntDetail from "./pages/hunt-detail";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import { PerplexityAttribution } from "./components/PerplexityAttribution";

function AppRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/check-in" component={CheckIn} />
          <Route path="/hunts/:id" component={HuntDetail} />
          <Route component={NotFound} />
        </Switch>
      </Router>
      <PerplexityAttribution />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
