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
import Profile from './pages/ProfilePage/Profile';

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
      <Sidebar />
      <Outlet />
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }): JSX.Element {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/*",
        element: <ProtectedRoute><MainPage /></ProtectedRoute>
      },
    ],
  },
  { path: "profile", element: <ProtectedRoute><Profile /></ProtectedRoute> },
  { path: "/login", element: <AuthPage /> },
  { path: "/register", element: <AuthPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);