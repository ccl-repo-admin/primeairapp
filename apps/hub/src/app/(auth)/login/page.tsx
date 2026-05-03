"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@primeair/ui";

const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "ClockHQ";
const LOGO_URL = process.env.NEXT_PUBLIC_COMPANY_LOGO_URL ?? null;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B3A6B] to-[#0891B2]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          {LOGO_URL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={LOGO_URL}
              alt={COMPANY_NAME}
              className="h-14 w-auto mx-auto mb-2 object-contain"
            />
          ) : (
            <div className="text-3xl font-bold text-primary mb-1">{COMPANY_NAME}</div>
          )}
          <CardTitle className="text-xl">Hub Login</CardTitle>
          <CardDescription>Sign in to manage your team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Field technicians:{" "}
            <a href={process.env.NEXT_PUBLIC_TIMECLOCK_URL ?? "http://localhost:3001"} className="text-secondary hover:underline">
              use the Timeclock app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
