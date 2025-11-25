import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import './index.css';

import { useAppStore } from '@/stores/appStore';
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from 'lucide-react';

import Layout from "./pages/Layout";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import BotView from "./pages/BotView";
import ConsoleTab from "./pages/ConsoleTab";
import PluginsTab from "./pages/PluginsTab";
import ConfigurationPage from "./pages/ConfigurationPage";
import ManagementPage from "./pages/ManagementPage";
import VisualEditorPage from "./pages/Bot/VisualEditorPage";
import EventGraphsPage from "./pages/Bot/EventGraphsPage";
import PluginDetailPage from "./pages/PluginDetailPage";
import PluginIdePage from "./pages/Bot/PluginIdePage";
import ServersPage from "./pages/ServersPage";
import ProxiesPage from "./pages/ProxiesPage";
import TasksPage from "./pages/TasksPage";
import AdminPage from "./pages/AdminPage";
import ProtectedRoute from '@/components/ProtectedRoute';
import PluginUIPage from "./pages/Bot/PluginUIPage";
import GraphStorePage from "./pages/GraphStorePage";
import ProxyConfigPage from "./pages/ProxyConfigPage";
import WebSocketTab from "./pages/Bot/WebSocketTab";
import PanelApiKeysPage from "./pages/PanelApiKeysPage";
import MinecraftViewerTab from "./pages/Bot/MinecraftViewerTab";

function Root() {
  const authInitialized = useAppStore(state => state.authInitialized);
  const initializeAuth = useAppStore(state => state.initializeAuth);
  const setTheme = useAppStore(state => state.setTheme);

  useEffect(() => {
    const savedTheme = localStorage.getItem('blockmine-theme') || 'system';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (!authInitialized) {
      initializeAuth();
    }
  }, [authInitialized]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}

function ProtectedLayout() {
    const isAuthenticated = useAppStore(state => state.isAuthenticated);
    const needsSetup = useAppStore(state => state.needsSetup);

    const connectSocket = useAppStore(state => state.connectSocket);
    const disconnectSocket = useAppStore(state => state.disconnectSocket);
    const fetchInitialData = useAppStore(state => state.fetchInitialData);
    const fetchTasks = useAppStore(state => state.fetchTasks);

    useEffect(() => {
        if (isAuthenticated) {
            connectSocket();
            fetchInitialData();
            fetchTasks();
        }
        return () => {
            disconnectSocket();
        }
    }, [isAuthenticated]);

    if (needsSetup) {
        return <Navigate to="/setup" replace />;
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Layout />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'setup',
        element: <SetupPage />
      },
      {
        path: '/',
        element: <ProtectedLayout />,
        children: [
            {
              index: true,
              element: <DashboardPage />,
            },
            {
              path: "bots/:botId",
              element: <BotView />,
              children: [
                  { index: true, element: <Navigate to="console" replace /> },
                  { path: "console", element: <ConsoleTab /> },
                  { path: "plugins", element: <PluginsTab /> },
                  { path: "plugins/view/:pluginName", element: <PluginDetailPage /> },
                  { path: "plugins/edit/:pluginName", element: <ProtectedRoute requiredPermission="plugin:develop"><PluginIdePage /></ProtectedRoute> },
                  { path: "settings", element: <ConfigurationPage /> },
                  { path: "management", element: <ProtectedRoute requiredPermission="management:view"><ManagementPage /></ProtectedRoute> },
                  { path: "commands/visual/:commandId", element: <ProtectedRoute requiredPermission="management:edit"><VisualEditorPage /></ProtectedRoute> },
                  { path: "events", element: <ProtectedRoute requiredPermission="management:edit"><EventGraphsPage /></ProtectedRoute> },
                  { path: "plugins/ui/:pluginName/:pluginPath", element: <PluginUIPage /> },
                  { path: "events/visual/:eventId", element: <ProtectedRoute requiredPermission="management:edit"><VisualEditorPage /></ProtectedRoute> },
                  { path: "websocket", element: <ProtectedRoute requiredPermission="bot:update"><WebSocketTab /></ProtectedRoute> },
                  { path: "minecraft-viewer", element: <MinecraftViewerTab /> }
              ]
            },
            { path: "servers", element: <ProtectedRoute requiredPermission="server:list"><ServersPage /></ProtectedRoute> },
            { path: "proxies", element: <ProtectedRoute requiredPermission="proxy:list"><ProxiesPage /></ProtectedRoute> },
            { path: "tasks", element: <ProtectedRoute requiredPermission="task:list"><TasksPage /></ProtectedRoute> },
            { path: "admin", element: <ProtectedRoute requiredPermission="panel:user:list"><AdminPage /></ProtectedRoute> },
            { path: "graph-store", element: <GraphStorePage /> },
            { path: "proxy-config", element: <ProtectedRoute requiredPermission="bot:update"><ProxyConfigPage /></ProtectedRoute> },
            { path: "api-keys", element: <PanelApiKeysPage /> },
        ]
      }
    ]
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="text-foreground bg-background">
        <RouterProvider router={router} />
        <Toaster />
    </div>
  </StrictMode>
);