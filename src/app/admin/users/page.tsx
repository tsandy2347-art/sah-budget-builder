"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2, Pencil, XCircle,
  XCircle,
  Trash2,
  Shield,
  ShieldOff,
  Loader2,
  Users,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  approved: boolean;
  createdAt: string;
  organisation?: { id: string; name: string } | null;
  _count: { budgets: number };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [editingName, setEditingName] = useState<{ id: string; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [adminOrgId, setAdminOrgId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  async function handleEditName(userId: string, newName: string) {
    if (!newName.trim()) return;
    try {
      setActionLoading(userId + "editname");
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: newName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      await fetchUsers();
      setEditingName(null);
    } catch (err) {
      setError((err as any).message || "Failed to update name");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || resetPassword.length < 6) return;
    setResetLoading(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResetMessage(data.message);
      setResetPassword("");
      setTimeout(() => { setResetTarget(null); setResetMessage(""); }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleChangeOrg(userId: string, organisationId: string) {
    setActionLoading(userId + "org");
    try {
      const res = await fetch("/api/admin/users/" + userId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchUsers();
    } catch {
      setError("Failed to change organisation.");
    } finally {
      setActionLoading(null);
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || data);
      if (data.adminOrgId === null) setIsSuperAdmin(true);
      setAdminOrgId(data.adminOrgId);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || (session.user as any).role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchUsers();
    fetch('/api/organisations').then(r => r.json()).then(d => { setOrgs(d); }).catch(() => {});
  }, [session, status, router, fetchUsers]);

  async function handleAction(userId: string, action: "approve" | "reject" | "delete" | "make-admin" | "remove-admin") {
    setActionLoading(userId + action);
    setError("");

    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
      } else {
        const body: Record<string, unknown> = {};
        if (action === "approve") body.approved = true;
        if (action === "reject") body.approved = false;
        if (action === "make-admin") body.role = "ADMIN";
        if (action === "remove-admin") body.role = "USER";

        const res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
      }
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  }

  const orgUsers = selectedOrgId ? users.filter((u) => u.organisation?.id === selectedOrgId) : users;
  const pendingUsers = orgUsers.filter((u) => !u.approved);
  const approvedUsers = orgUsers.filter((u) => u.approved);
  const selectedOrgName = orgs.find((o) => o.id === selectedOrgId)?.name || "All";

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Approve new users, manage roles, and remove access
          </p>
        </div>
      </div>

      {isSuperAdmin && orgs.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={selectedOrgId === "" ? "default" : "outline"}
            onClick={() => setSelectedOrgId("")}
          >
            All
          </Button>
          {orgs.map((org) => (
            <Button
              key={org.id}
              variant={selectedOrgId === org.id ? "default" : "outline"}
              onClick={() => setSelectedOrgId(org.id)}
            >
              {org.name}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pending Approval */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Approval ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(user.id, "approve")}
                        disabled={actionLoading === user.id + "approve"}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === user.id + "approve" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(user.id, "delete")}
                        disabled={actionLoading === user.id + "delete"}
                      >
                        {actionLoading === user.id + "delete" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Dialog */}
      {resetTarget && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              Reset Password for {resetTarget.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resetMessage ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-300">{resetMessage}</AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="adminResetPw">New password for {resetTarget.email}</Label>
                  <Input
                    id="adminResetPw"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    minLength={6}
                  />
                </div>
                <Button onClick={handleResetPassword} disabled={resetLoading || resetPassword.length < 6}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                  Reset
                </Button>
                <Button variant="outline" onClick={() => setResetTarget(null)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approved Users */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Active Users ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Budgets</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedUsers.map((user) => {
                  const isMe = user.id === (session?.user as any)?.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {editingName?.id === user.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 text-sm w-40"
                              value={editingName.name}
                              onChange={(e) => setEditingName({ ...editingName, name: e.target.value })}
                              onKeyDown={(e) => { if (e.key === "Enter") handleEditName(user.id, editingName.name); if (e.key === "Escape") setEditingName(null); }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleEditName(user.id, editingName.name)} disabled={!!actionLoading}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingName(null)}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {user.name}
                            {isMe && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-1" onClick={() => setEditingName({ id: user.id, name: user.name })}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.role === "ADMIN" ? (
                          <Badge className="bg-blue-600">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <select
                          className="text-sm border rounded px-2 py-1 bg-background"
                          value={user.organisation?.id || ""}
                          onChange={(e) => handleChangeOrg(user.id, e.target.value)}
                          disabled={!!actionLoading}
                        >
                          <option value="">No org</option>
                          {orgs.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user._count.budgets}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!isMe && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setResetTarget({ id: user.id, name: user.name, email: user.email }); setResetPassword(""); setResetMessage(""); }}
                              disabled={!!actionLoading}
                              title="Reset password"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            {user.role === "USER" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(user.id, "make-admin")}
                                disabled={!!actionLoading}
                                title="Make admin"
                              >
                                {actionLoading === user.id + "make-admin" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Shield className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(user.id, "remove-admin")}
                                disabled={!!actionLoading}
                                title="Remove admin"
                              >
                                {actionLoading === user.id + "remove-admin" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ShieldOff className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(user.id, "reject")}
                              disabled={!!actionLoading}
                              title="Revoke access"
                            >
                              {actionLoading === user.id + "reject" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Delete ${user.name}? This will also delete their ${user._count.budgets} budget(s).`)) {
                                  handleAction(user.id, "delete");
                                }
                              }}
                              disabled={!!actionLoading}
                              title="Delete user"
                            >
                              {actionLoading === user.id + "delete" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
