import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import DashboardPage from '@/pages/DashboardPage';
import ArchitecturePage from '@/pages/ArchitecturePage';
import DigitalTwinPage from '@/pages/DigitalTwinPage';
import SimulationPage from '@/pages/SimulationPage';
import PredictionPage from '@/pages/PredictionPage';
import PerformancePage from '@/pages/PerformancePage';
import SecurityPage from '@/pages/SecurityPage';
import KubernetesPage from '@/pages/KubernetesPage';
import NetworkPage from '@/pages/NetworkPage';
import CostPage from '@/pages/CostPage';
import MultiCloudPage from '@/pages/MultiCloudPage';
import CloudConnectionsPage from '@/pages/CloudConnectionsPage';
import OptimizerPage from '@/pages/OptimizerPage';
import ChaosLabPage from '@/pages/ChaosLabPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import WebsiteMonitorPage from '@/pages/WebsiteMonitorPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/twin" element={<DigitalTwinPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/predictions" element={<PredictionPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/website-monitor" element={<WebsiteMonitorPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/kubernetes" element={<KubernetesPage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/cost" element={<CostPage />} />
        <Route path="/multicloud" element={<MultiCloudPage />} />
        <Route path="/connections" element={<CloudConnectionsPage />} />
        <Route path="/optimizer" element={<OptimizerPage />} />
        <Route path="/chaos" element={<ChaosLabPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
