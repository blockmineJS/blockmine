import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function RequireAuth({ children }) {
    const { isAuthenticated, checkingAuth, needsSetup, checkAuth } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    if (checkingAuth) {
        return <div className="p-10 text-center">Проверка авторизации...</div>;
    }

    if (needsSetup) {
        return <Navigate to="/setup" replace />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
