import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const hasPermission = useAppStore((state) => state.hasPermission);
    const authInitialized = useAppStore((state) => state.authInitialized);
    const { toast } = useToast();

    const canAccess = hasPermission(requiredPermission);

    useEffect(() => {
        if (authInitialized && !canAccess) {
            toast({
                variant: 'destructive',
                title: 'Доступ запрещен',
                description: 'У вас недостаточно прав для просмотра этой страницы.',
            });
        }
    }, [canAccess, authInitialized, toast]);

    if (!authInitialized) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return canAccess ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;