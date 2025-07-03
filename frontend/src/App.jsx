import { useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouterProvider } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { router } from './router';

function App() {
    const checkAuth = useAppStore(state => state.checkAuth);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    
    return (
        <TooltipProvider>
            <Toaster />
            <RouterProvider router={router} />
        </TooltipProvider>
    );
}

export default App;