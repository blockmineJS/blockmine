import { shallow } from 'zustand/shallow';

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('login');
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
            setError(err.message || t('loginError'));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setRecoveryError('');
        
        if (!recoveryCode) {
            setRecoveryError(t('recovery.enterCode'));
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
            setRecoveryError(err.response?.data?.error || t('recovery.verifyError'));
        } finally {
            setRecoveryLoading(false);
        }
    };
    
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setRecoveryError('');
        setRecoverySuccess(null);
        
        if (newPassword !== confirmPassword) {
            setRecoveryError(t('recovery.passwordMismatch'));
            return;
        }

        if (newPassword.length < 4) {
            setRecoveryError(t('recovery.passwordTooShort'));
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
            setRecoveryError(err.response?.data?.error || t('recovery.resetError'));
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
                    <CardTitle className="text-2xl">{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">{t('username')}</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t('password')}</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('submit')}
                        </Button>
                        <Button
                            type="button"
                            variant="link"
                            className="text-sm text-muted-foreground hover:text-primary"
                            onClick={() => setShowRecovery(true)}
                        >
                            <KeyRound className="mr-1 h-3 w-3" />
                            {t('forgotPassword')}
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
                            {recoveryStep === 1 ? t('recovery.titleVerify') : t('recovery.titleReset')}
                        </DialogTitle>
                        <DialogDescription>
                            {recoveryStep === 1
                                ? t('recovery.descriptionVerify')
                                : t('recovery.descriptionReset', { username: adminUsername })
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    {recoverySuccess ? (
                        <Alert className="mt-4">
                            <AlertDescription className="text-green-600">
                                <strong>{recoverySuccess.message}</strong>
                                <br />
                                {t('recovery.usernameLabel')}: <strong>{recoverySuccess.username}</strong>
                                <br />
                                {t('recovery.canUseNewPassword')}
                            </AlertDescription>
                        </Alert>
                    ) : recoveryStep === 1 ? (
                        <form onSubmit={handleVerifyCode}>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="recovery-code">{t('recovery.codeLabel')}</Label>
                                    <Input
                                        id="recovery-code"
                                        placeholder={t('recovery.codePlaceholder')}
                                        value={recoveryCode}
                                        onChange={(e) => setRecoveryCode(e.target.value)}
                                        required
                                        disabled={recoveryLoading}
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t('recovery.codeHint')}
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
                                    {t('recovery.cancel')}
                                </Button>
                                <Button type="submit" disabled={recoveryLoading || !recoveryCode}>
                                    {recoveryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('recovery.verify')}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <div className="space-y-4 py-4">
                                <Alert>
                                    <AlertDescription>
                                        {t('recovery.codeVerified')} {t('recovery.user')}: <strong>{adminUsername}</strong>
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-2">
                                    <Label htmlFor="new-password">{t('recovery.newPassword')}</Label>
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
                                    <Label htmlFor="confirm-password">{t('recovery.confirmPassword')}</Label>
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
                                    {t('recovery.back')}
                                </Button>
                                <Button type="submit" disabled={recoveryLoading || !newPassword || !confirmPassword}>
                                    {recoveryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('recovery.reset')}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}