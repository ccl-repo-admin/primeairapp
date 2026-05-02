"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@primeair/ui";

type Step = "phone" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setStep("code");
    } catch {
      setError("Could not send code. Check your phone number.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("otp", {
      phone: phone.replace(/\D/g, ""),
      code,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid or expired code");
      setLoading(false);
    } else {
      router.push("/clock");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#1B3A6B] to-[#0891B2] p-4">
      <div className="text-white text-center mb-8">
        <div className="text-4xl font-bold mb-1">Prime Air</div>
        <p className="text-white/70 text-sm">Field App</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{step === "phone" ? "Enter Your Phone" : "Enter Code"}</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "We'll send a 6-digit code to verify your identity"
              : `Code sent to ${phone} — check your texts`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">6-Digit Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  className="text-2xl tracking-widest text-center h-14"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-14 text-base" disabled={loading || code.length !== 6}>
                {loading ? "Verifying..." : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              >
                Use different number
              </Button>
            </form>
          )}

          {process.env.NODE_ENV === "development" && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Dev: use code <strong>123456</strong> to bypass Twilio
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
