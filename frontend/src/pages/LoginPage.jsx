import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const login = useAuthStore(state => state.login);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Ошибка', description: err.message });
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Вход</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Вход...' : 'Войти'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
