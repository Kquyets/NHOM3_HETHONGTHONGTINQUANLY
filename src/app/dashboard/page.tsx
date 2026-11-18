"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "../../components/layout/app-header";
import { DashboardView } from "../../components/dashboard/dashboard-view";
import { TenantPortalView } from "../../components/tenant-portal/tenant-portal-view";
import { useAuth } from "../../lib/auth-context";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="main-container">
          <div className="stats-grid" aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card" style={{ minHeight: 120 }}>
                <div
                  className="skeleton"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    marginBottom: 12,
                  }}
                />
                <div className="skeleton" style={{ width: "50%", height: 11, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: "40%", height: 28, marginBottom: 6 }} />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />
      {user.role === "tenant" ? <TenantPortalView /> : <DashboardView />}
    </div>
  );
}
