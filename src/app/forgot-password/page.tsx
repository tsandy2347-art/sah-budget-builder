"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2, Copy, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResetLink("");
    setLoading(true);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else if (data.token) {
        const link = `${window.location.origin}/reset-password?token=${data.token}`;
        setResetLink(link);
      } else {
        setError("No account found with that email address.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
            SaH
          </div>
          <CardTitle className="text-xl">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          {!resetLink ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generate Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  Reset link generated. Use it within 1 hour.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Your reset link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={resetLink}
                    className="text-xs font-mono"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600">Copied!</p>}
              </div>
              <Button asChild className="w-full">
                <Link href={resetLink}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Reset Page
                </Link>
              </Button>
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
