import React, { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Github, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GithubInstallDialog({ onInstall, onCancel, isInstalling }) {
    const [repoUrl, setRepoUrl] = useState('');
    const [error, setError] = useState('');

    const validateGithubUrl = (url) => {
        if (!url) {
            return 'Введите URL репозитория';
        }

        // Поддерживаемые форматы:
        // https://github.com/user/repo
        // https://github.com/user/repo.git
        // github.com/user/repo
        // user/repo
        const patterns = [
            /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
            /^github\.com\/[\w-]+\/[\w.-]+$/,
            /^[\w-]+\/[\w.-]+$/
        ];

        const isValid = patterns.some(pattern => pattern.test(url.trim()));

        if (!isValid) {
            return 'Неверный формат URL. Примеры: https://github.com/user/repo или user/repo';
        }

        return null;
    };

    const handleInstall = async () => {
        const validationError = validateGithubUrl(repoUrl);
        if (validationError) {
            setError(validationError);
            return;
        }

        setError('');

        // Нормализуем URL к формату https://github.com/user/repo
        let normalizedUrl = repoUrl.trim();
        if (!normalizedUrl.startsWith('http')) {
            normalizedUrl = normalizedUrl.replace(/^github\.com\//, '');
            normalizedUrl = `https://github.com/${normalizedUrl}`;
        }
        normalizedUrl = normalizedUrl.replace(/\.git$/, '');

        await onInstall(normalizedUrl);
    };

    const handleChange = (value) => {
        setRepoUrl(value);
        if (error) setError('');
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    Установить плагин из GitHub
                </DialogTitle>
                <DialogDescription>
                    Установите плагин напрямую из GitHub репозитория
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="repoUrl">URL репозитория</Label>
                    <Input
                        id="repoUrl"
                        placeholder="https://github.com/username/plugin-name"
                        value={repoUrl}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={isInstalling}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isInstalling) {
                                handleInstall();
                            }
                        }}
                    />
                    <p className="text-xs text-muted-foreground">
                        Поддерживаемые форматы:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>• https://github.com/username/repo</li>
                        <li>• github.com/username/repo</li>
                        <li>• username/repo</li>
                    </ul>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        <strong>Внимание:</strong> Устанавливайте только проверенные плагины из надежных источников.
                        Вредоносный код может нанести вред вашему боту и серверу.
                    </AlertDescription>
                </Alert>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={isInstalling}>
                    Отмена
                </Button>
                <Button onClick={handleInstall} disabled={isInstalling || !repoUrl}>
                    {isInstalling ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Установка...
                        </>
                    ) : (
                        <>
                            <Github className="mr-2 h-4 w-4" />
                            Установить
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}
