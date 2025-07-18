import { shallow } from 'zustand/shallow';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from 'axios';

export default function LoginPage() {
    const login = useAppStore((state) => state.login);
    const isAuthenticated = useAppStore((state) => state.isAuthenticated);
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryStep, setRecoveryStep] = useState(1);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [recoveryLoading, setRecoveryLoading] = useState(false);
    const [recoveryError, setRecoveryError] = useState('');
    const [recoverySuccess, setRecoverySuccess] = useState(null);
    const [configPath, setConfigPath] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);
    
    useEffect(() => {
        if (showRecovery) {
            axios.get('/api/auth/config-path')
                .then(response => {
                    setConfigPath(response.data.configPath);
                })
                .catch(error => {
                    console.error('Не удалось загрузить путь к конфигу:', error);
                });
        }
    }, [showRecovery]);

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
    
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setRecoveryError('');
        
        if (!recoveryCode) {
            setRecoveryError('Введите код восстановления');
            return;
        }
        
        setRecoveryLoading(true);
        try {
            const response = await axios.post('/api/auth/recovery/verify', {
                recoveryCode
            });
            
            if (response.data.success) {
                setResetToken(response.data.resetToken);
                setAdminUsername(response.data.username);
                setRecoveryStep(2);
                setRecoveryError('');
            }
            
        } catch (err) {
            setRecoveryError(err.response?.data?.error || 'Ошибка при проверке кода');
        } finally {
            setRecoveryLoading(false);
        }
    };
    
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setRecoveryError('');
        setRecoverySuccess(null);
        
        if (newPassword !== confirmPassword) {
            setRecoveryError('Пароли не совпадают');
            return;
        }
        
        if (newPassword.length < 4) {
            setRecoveryError('Пароль должен содержать минимум 4 символа');
            return;
        }
        
        setRecoveryLoading(true);
        try {
            const response = await axios.post('/api/auth/recovery/reset', {
                resetToken,
                newPassword
            });
            
            setRecoverySuccess({
                message: response.data.message,
                username: response.data.username
            });
            
            setUsername(response.data.username);
            setPassword('');
            
            setTimeout(() => {
                setShowRecovery(false);
                resetRecoveryState();
            }, 3000);
            
        } catch (err) {
            setRecoveryError(err.response?.data?.error || 'Ошибка при сбросе пароля');
        } finally {
            setRecoveryLoading(false);
        }
    };
    
    const resetRecoveryState = () => {
        setRecoveryStep(1);
        setRecoveryCode('');
        setResetToken('');
        setAdminUsername('');
        setNewPassword('');
        setConfirmPassword('');
        setRecoveryError('');
        setRecoverySuccess(null);
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
                    <CardFooter className="flex flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Войти
                        </Button>
                        <Button 
                            type="button" 
                            variant="link" 
                            className="text-sm text-muted-foreground hover:text-primary"
                            onClick={() => setShowRecovery(true)}
                        >
                            <KeyRound className="mr-1 h-3 w-3" />
                            Забыли пароль?
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            
            <Dialog open={showRecovery} onOpenChange={(open) => {
                setShowRecovery(open);
                if (!open) resetRecoveryState();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {recoveryStep === 1 ? 'Проверка кода восстановления' : 'Установка нового пароля'}
                        </DialogTitle>
                        <DialogDescription>
                            {recoveryStep === 1 
                                ? 'Введите код восстановления из конфигурационного файла'
                                : `Установите новый пароль для пользователя ${adminUsername}`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    {recoverySuccess ? (
                        <Alert className="mt-4">
                            <AlertDescription className="text-green-600">
                                <strong>{recoverySuccess.message}</strong>
                                <br />
                                Имя пользователя: <strong>{recoverySuccess.username}</strong>
                                <br />
                                Вы можете использовать новый пароль для входа.
                            </AlertDescription>
                        </Alert>
                    ) : recoveryStep === 1 ? (
                        <form onSubmit={handleVerifyCode}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="recovery-code">Код восстановления</Label>
                                    <Input
                                        id="recovery-code"
                                        placeholder="bmr-xxxxxxxxxxxx"
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value)}
                                        required
                                        disabled={recoveryLoading}
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Код восстановления находится в файле конфигурации:
                                    </p>
                                    {configPath && (
                                        <div className="mt-2 p-2 bg-muted rounded-md">
                                            <code className="text-xs break-all select-all">{configPath}</code>
                                        </div>
                                    )}
                                </div>
                                
                                {recoveryError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{recoveryError}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowRecovery(false);
                                        resetRecoveryState();
                                    }}
                                    disabled={recoveryLoading}
                                >
                                    Отмена
                                </Button>
                                <Button type="submit" disabled={recoveryLoading || !recoveryCode}>
                                    {recoveryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Проверить код
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <div className="space-y-4 py-4">
                                <Alert>
                                    <AlertDescription>
                                        Код восстановления подтверждён. 
                                        Пользователь: <strong>{adminUsername}</strong>
                                    </AlertDescription>
                                </Alert>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Новый пароль</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={recoveryLoading}
                                        autoFocus
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={recoveryLoading}
                                    />
                                </div>
                                
                                {recoveryError && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{recoveryError}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRecoveryStep(1)}
                                    disabled={recoveryLoading}
                                >
                                    Назад
                                </Button>
                                <Button type="submit" disabled={recoveryLoading || !newPassword || !confirmPassword}>
                                    {recoveryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Сбросить пароль
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}