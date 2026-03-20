"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { apiSaveBudget } from "@/lib/api-client";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface ImportBudgetButtonProps {
  onImported: () => void;
}

export function ImportBudgetButton({ onImported }: ImportBudgetButtonProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; services: number; id: string } | null>(null);

  async function handleFile(file: File) {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const { importBudgetFromExcel } = await import("@/lib/import-excel");
      const budget = await importBudgetFromExcel(file);

      // Save to database
      await apiSaveBudget(budget);

      const totalServices = budget.tabs.reduce((s, t) => s + t.services.length, 0);
      setSuccess({
        name: budget.clientName || "Unnamed client",
        services: totalServices,
        id: budget.id,
      });
      onImported();
    } catch (err: any) {
      setError(err.message || "Failed to import spreadsheet");
    } finally {
      setImporting(false);
      // Reset the file input
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleChange}
      />

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
      >
        {importing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Import Excel
      </Button>

      {/* Error dialog */}
      <Dialog open={!!error} onOpenChange={() => setError(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Import Failed
            </DialogTitle>
            <DialogDescription className="sr-only">Import error details</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{error}</p>
          <DialogFooter>
            <Button onClick={() => setError(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!success} onOpenChange={() => setSuccess(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Import Successful
            </DialogTitle>
            <DialogDescription className="sr-only">Import success details</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Budget imported for <span className="font-medium text-foreground">{success?.name}</span>
            </p>
            <p>
              <span className="font-medium text-foreground">{success?.services}</span> services loaded across all tabs
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuccess(null)}>
              Stay on Dashboard
            </Button>
            <Button
              onClick={() => {
                if (success) router.push(`/budget/${success.id}`);
                setSuccess(null);
              }}
            >
              Open Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
