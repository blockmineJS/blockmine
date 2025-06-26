import { shallow } from 'zustand/shallow';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const login = useAppStore((state) => state.login);
    const isAuthenticated = useAppStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message || 'Не удалось войти.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Вход в BlockMine</CardTitle>
                    <CardDescription>Введите ваши учетные данные для доступа к панели.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Войти
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}