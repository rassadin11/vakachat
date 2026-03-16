// src/main.tsx
import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Outlet, useNavigate, RouterProvider, Navigate } from "react-router-dom";
import { MainPage } from './pages/MainPage/MainPage';
import Sidebar from './components/Sidebar/Sidebar';
import AuthPage from './pages/AuthPage/AuthPage';
import { authApi } from './api/auth';
import { setAccessToken, getAccessToken } from './api/client';
import './App.scss'
import { useChatStore } from './store/chatStore';
import StartPage from './pages/StartPage/StartPage';
import NotFoundChat from './pages/NotFoundChat/NotFoundChat';

function RootLayout(): JSX.Element {  // ← не Promise<JSX.Element>
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false); // ← ждём результат refresh
  const setUser = useChatStore((s) => s.setUser);

  useEffect(() => {
    authApi.refresh()
      .then(data => {
        setAccessToken(data.accessToken);
        authApi.me().then(res => setUser(res));
        setIsReady(true);
      })
      .catch(() => {
        setIsReady(true); // даже при ошибке — разблокируем рендер
        navigate("/login");
      });
  }, []);

  // Не рендерим дочерние роуты пока не знаем статус авторизации
  if (!isReady) return <div className="app-loader" />;

  return (
    <div className="app">
      <Outlet />
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

function ChatLayout(): JSX.Element {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);

  useEffect(() => {
    const theme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={toggleSidebar}
      />
      <Sidebar />
      {!sidebarOpen && (
        <button className="sidebar-open-btn" onClick={toggleSidebar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
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
          { path: "/chats/not-found", element: <ProtectedRoute><NotFoundChat /></ProtectedRoute> }
        ],
      },
      // {
      //   path: "/profile",            // ← без Sidebar
      //   element: <ProtectedRoute><Profile /></ProtectedRoute>
      // },
    ],
  },
  { path: "/login", element: <AuthPage /> },
  { path: "/register", element: <AuthPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);