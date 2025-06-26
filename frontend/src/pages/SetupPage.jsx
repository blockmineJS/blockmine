import { shallow } from 'zustand/shallow';


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SetupPage() {
    const { setupAdmin, isAuthenticated } = useAppStore(
        (state) => ({ setupAdmin: state.setupAdmin, isAuthenticated: state.isAuthenticated }),
        shallow
    );
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 4) {
            setError('Пароль должен содержать не менее 4 символов.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают.');
            return;
        }

        setIsLoading(true);
        setError('');
        
        try {
            await setupAdmin(username, password);
            
            toast({ title: "Добро пожаловать!", description: "Вы успешно вошли в систему." });

        } catch (err) {
            setError(err.message || 'Не удалось создать аккаунт.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Первоначальная настройка</CardTitle>
                    <CardDescription>Создайте аккаунт администратора для панели BlockMine.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Имя администратора</Label>
                            <Input 
                                id="username" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль (мин. 4 символа)</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Создать
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}