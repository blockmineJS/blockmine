import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ManifestEditor({ botId, pluginName }) {
    const [manifest, setManifest] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchManifest = async () => {
            setIsLoading(true);
            try {
                const data = await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/manifest`);
                setManifest(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить manifest.' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchManifest();
    }, [botId, pluginName]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiHelper(`/api/bots/${botId}/plugins/ide/${pluginName}/manifest`, {
                method: 'POST',
                body: JSON.stringify({
                    name: manifest.name,
                    version: manifest.version,
                    description: manifest.description,
                    author: manifest.author,
                    repositoryUrl: manifest.repositoryUrl || manifest.repository?.url || ''
                }),
            });
            toast({ title: 'Успех!', description: 'package.json успешно обновлен.' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить manifest.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <div className="p-4 flex justify-center items-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!manifest) {
        return <div className="p-4 text-center text-muted-foreground">Не удалось загрузить package.json</div>;
    }

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setManifest(prev => ({...prev, [id]: value }));
    }

    const handleRepositoryUrlChange = (e) => {
        const value = e.target.value;
        setManifest(prev => ({
            ...prev,
            repositoryUrl: value
        }));
    }

    return (
        <div className="p-4 space-y-4">
            <div className="space-y-1">
                <Label htmlFor="version">Версия</Label>
                <Input id="version" value={manifest.version || ''} onChange={handleInputChange} />
            </div>
             <div className="space-y-1">
                <Label htmlFor="description">Описание</Label>
                <Textarea id="description" value={manifest.description || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-1">
                <Label htmlFor="author">Автор</Label>
                <Input id="author" value={manifest.author || ''} onChange={handleInputChange} />
            </div>
            
            <div className="space-y-1">
                <Label htmlFor="repositoryUrl">URL репозитория</Label>
                <Input 
                    id="repositoryUrl" 
                    placeholder="https://github.com/user/repo.git" 
                    value={manifest.repository?.url || manifest.repositoryUrl || ''} 
                    onChange={handleRepositoryUrlChange} 
                />
                <p className="text-sm text-muted-foreground">
                    Нужен для создания Pull Request'ов в оригинальный репозиторий
                </p>
            </div>
            
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить package.json
            </Button>
        </div>
    );
} 