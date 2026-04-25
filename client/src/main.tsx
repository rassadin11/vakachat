// src/main.tsx
import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, RouterProvider, Navigate } from "react-router-dom";
import { SidebarToggleIcon } from './assets/icons';
import { MainPage } from './pages/MainPage/MainPage';
import AuthPage from './pages/AuthPage/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import Profile from './pages/ProfilePage/Profile';
import { authApi } from './api/auth';
import { setAccessToken, getAccessToken } from './api/client';
import './App.scss'
import { useChatStore } from './store/chatStore';
import StartPage from './pages/StartPage/StartPage';
import NotFoundChat from './pages/NotFoundChat/NotFoundChat';
import Notification from './components/Notification/Notification';
import Sidebar from './components/Sidebar/Sidebar';

function RootLayout(): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const setUser = useChatStore((s) => s.setUser);
  const setIsGuest = useChatStore((s) => s.setIsGuest);
  const fetchModels = useChatStore((s) => s.fetchModels);

  useEffect(() => {
    authApi.refresh()
      .then(data => {
        setAccessToken(data.accessToken);
        authApi.me().then(res => setUser(res));
        setIsReady(true);
      })
      .catch(() => {
        setIsGuest(true);
        fetchModels(); // загружаем модели для гостя в фоне
        setIsReady(true);
      });
  }, []);

  if (!isReady) return <div className="app-loader" />;

  return (
    <div className="app">
      <Outlet />
    </div>
  );
}

function ProtectedRoute({ children, authOnly = false }: { children: JSX.Element; authOnly?: boolean }): JSX.Element {
  const isGuest = useChatStore((s) => s.isGuest);
  if (authOnly) return getAccessToken() ? children : <Navigate to="/login" replace />;
  return (getAccessToken() || isGuest) ? children : <Navigate to="/login" replace />;
}

function ChatLayout(): JSX.Element {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={toggleSidebar}
      />
      <Sidebar />
      <Notification />
      {!sidebarOpen && (
        <button className="sidebar-open-btn" onClick={toggleSidebar}>
          <SidebarToggleIcon width="16" height="16" />
        </button>
      )}
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <ChatLayout />,
        children: [
          { path: "/", element: <ProtectedRoute><StartPage /></ProtectedRoute> },
          { path: "/chats/:chatId", element: <ProtectedRoute><MainPage /></ProtectedRoute> },
          { path: "/chats/not-found", element: <ProtectedRoute><NotFoundChat /></ProtectedRoute> },
          { path: "/profile", element: <ProtectedRoute authOnly><Profile /></ProtectedRoute> },
        ],
      },
    ],
  },
  { path: "/login", element: <AuthPage /> },
  { path: "/register", element: <AuthPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);