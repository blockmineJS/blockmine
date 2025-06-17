import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

import { useAppStore } from '@/stores/appStore';
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from 'lucide-react';

import Layout from './pages/Layout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import BotView from './pages/BotView';
import ConsoleTab from './pages/ConsoleTab';
import PluginsTab from './pages/PluginsTab';
import ConfigurationPage from './pages/ConfigurationPage';
import ManagementPage from './pages/ManagementPage';
import PluginDetailPage from './pages/PluginDetailPage';
import ServersPage from './pages/ServersPage';
import TasksPage from './pages/TasksPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';

function AppWrapper() {
    const { 
        isAuthenticated, 
        needsSetup, 
        authInitialized, 
        initializeAuth,
        connectSocket,
        fetchInitialData,
        fetchTasks 
    } = useAppStore();

    useEffect(() => {
        if (!authInitialized) {
            initializeAuth();
        }
    }, [authInitialized, initializeAuth]);

    useEffect(() => {
        if (isAuthenticated) {
            console.log("[Auth] Пользователь аутентифицирован. Загружаем данные и подключаем сокет...");
            connectSocket();
            fetchInitialData();
            fetchTasks();
        }
    }, [isAuthenticated, connectSocket, fetchInitialData, fetchTasks]);
    
    if (!authInitialized) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (needsSetup) {
        return <SetupPage />;
    }
    
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return <Layout />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppWrapper />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "bots/:botId",
        element: <BotView />,
        children: [
            { index: true, element: <ConsoleTab /> },
            { path: "console", element: <ConsoleTab /> },
            { path: "plugins", element: <PluginsTab /> },
            { path: "settings", element: <ConfigurationPage /> },
            { 
              path: "management", 
              element: (
                <ProtectedRoute requiredPermission="management:view">
                  <ManagementPage />
                </ProtectedRoute>
              )
            },
            { path: "plugins/view/:pluginName", element: <PluginDetailPage /> },
        ]
      },
      {
        path: "servers",
        element: (
          <ProtectedRoute requiredPermission="server:list">
            <ServersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "tasks",
        element: (
          <ProtectedRoute requiredPermission="task:list">
            <TasksPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute requiredPermission="panel:user:list">
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="dark text-foreground bg-background">
        <RouterProvider router={router} />
        <Toaster />
    </div>
  </StrictMode>,
);