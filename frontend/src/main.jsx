import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

import Layout from './pages/Layout';
import BotView from './pages/BotView';
import ConsoleTab from './pages/ConsoleTab';
import PluginsTab from './pages/PluginsTab';
import ConfigurationPage from './pages/ConfigurationPage';
import ServersPage from './pages/ServersPage';
import { Toaster } from "@/components/ui/toaster";
import ManagementPage from './pages/ManagementPage';
import DashboardPage from './pages/DashboardPage';
import PluginDetailPage from './pages/PluginDetailPage';
import TasksPage from './pages/TasksPage';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> }, 
      {
        path: "bots/:botId",
        element: <BotView />,
        children: [
          { index: true, element: <ConsoleTab /> },
          { path: "console", element: <ConsoleTab /> },
          { path: "plugins", element: <PluginsTab /> },
          { path: "settings", element: <ConfigurationPage /> },
          { path: "management", element: <ManagementPage /> }, 
          { path: "plugins/view/:pluginName", element: <PluginDetailPage /> },
        ]
      },
      {
        path: "servers",
        element: <ServersPage />,
      },
      {
        path: "tasks",
        element: <TasksPage />,
      },
    ]
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