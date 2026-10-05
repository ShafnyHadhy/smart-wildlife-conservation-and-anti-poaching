import { useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { NavPage } from './components/layout/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { PatrolsPage } from './pages/PatrolsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AlertsPage } from './pages/AlertsPage';
import { ConflictsPage } from './pages/ConflictsPage';

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <DashboardLayout
      activePage={activePage}
      onNavigate={setActivePage}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      {activePage === 'dashboard' && (
        <DashboardHome
          onNavigate={setActivePage}
          refreshTrigger={refreshTrigger}
        />
      )}
      {activePage === 'patrols' && <PatrolsPage />}
      {activePage === 'incidents' && <IncidentsPage />}
      {activePage === 'alerts' && <AlertsPage />}
      {activePage === 'conflicts' && <ConflictsPage />}
    </DashboardLayout>
  );
}
