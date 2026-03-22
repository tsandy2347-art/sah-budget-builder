"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Home, LogOut, Users } from "lucide-react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-base text-foreground hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">SaH</div>
          <span>Budget Builder</span>
        </Link>
        <div className="flex items-center gap-2">
          {session?.user && (
            <span className="text-sm text-muted-foreground hidden sm:inline mr-2">
              {session.user.name}
            </span>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" asChild title="Manage Users">
              <Link href="/admin/users">
                <Users className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/" aria-label="Dashboard">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          {session && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
