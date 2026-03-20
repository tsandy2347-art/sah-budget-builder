import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaH Budget Builder",
  description: "Support at Home Budget Planning Tool for Australian aged care providers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            <div className="min-h-screen flex flex-col bg-background">
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t bg-muted/40 px-6 py-4 text-xs text-muted-foreground text-center leading-relaxed">
                This tool is for planning and estimation purposes only. Actual funding amounts are subject to
                indexation and may change. Contribution rates for part pensioners depend on individual means testing
                by Services Australia. Always verify current rates via the Schedule of Subsidies and Supplements on
                the Department of Health, Disability and Ageing website.
              </footer>
            </div>
          </TooltipProvider>
        </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
