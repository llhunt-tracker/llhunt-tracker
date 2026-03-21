import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Crosshair, LogIn, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <svg viewBox="0 0 40 40" className="h-10 w-10 text-primary">
              <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="20" cy="20" r="4" fill="currentColor" />
              <line x1="20" y1="2" x2="20" y2="9" stroke="currentColor" strokeWidth="2.5" />
              <line x1="20" y1="31" x2="20" y2="38" stroke="currentColor" strokeWidth="2.5" />
              <line x1="2" y1="20" x2="9" y2="20" stroke="currentColor" strokeWidth="2.5" />
              <line x1="31" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="2.5" />
            </svg>
            <span className="text-2xl font-bold tracking-wide">LLHUNT</span>
          </div>
          <p className="text-muted-foreground text-sm">Hunt Tracker</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-base">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive text-center" data-testid="text-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                data-testid="button-login"
                className="w-full font-semibold gap-2"
                disabled={loading || !username || !password}
              >
                {loading ? "Signing in..." : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          LLHUNT Adventures LLC
        </p>
      </div>
    </div>
  );
}
