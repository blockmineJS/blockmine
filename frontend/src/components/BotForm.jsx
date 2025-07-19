import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import DynamicInputList from './management/DynamicInputList';

export default function BotForm({ bot, servers, onFormChange, onFormSubmit, isCreation = false, isSaving = false, errors = {} }) {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        prefix: '@',
        note: '',
        serverId: '',
        owners: [],
        proxyHost: '',
        proxyPort: '',
        proxyUsername: '',
        proxyPassword: ''
    });
    const [usernameError, setUsernameError] = useState('');
    const isInitialized = React.useRef(false);

    useEffect(() => {
        if (errors.username) {
            setUsernameError(errors.username);
        }
    }, [errors.username]);

    useEffect(() => {
        if (bot) {
            isInitialized.current = false;
            setFormData({
                username: bot.username || '',
                password: '', 
                prefix: bot.prefix || '@',
                note: bot.note || '',
                serverId: bot.serverId ? bot.serverId.toString() : '',
                owners: bot.owners ? bot.owners.split(',').map(s => s.trim()).filter(Boolean) : [],
                proxyHost: bot.proxyHost || '',
                proxyPort: bot.proxyPort || '',
                proxyUsername: bot.proxyUsername || '',
                proxyPassword: ''
            });
        }
    }, [bot]);

    useEffect(() => {
        if (onFormChange) {
            if (isInitialized.current) {
                onFormChange(formData);
            } else {
                isInitialized.current = true;
            }
        }
    }, [formData, onFormChange]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'username') {
            setUsernameError('');
        }
    };

    const handleSelectChange = (value) => {
        setFormData(prev => ({ ...prev, serverId: value }));
    };

    const handleOwnersChange = (newOwners) => {
        setFormData(prev => ({ ...prev, owners: newOwners }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onFormSubmit) {
            const dataToSubmit = { ...formData };
            if (Array.isArray(dataToSubmit.owners)) {
                dataToSubmit.owners = dataToSubmit.owners.join(',');
            }
            if (!dataToSubmit.password) delete dataToSubmit.password;
            if (!dataToSubmit.proxyPassword) delete dataToSubmit.proxyPassword;
            onFormSubmit(dataToSubmit);
        }
    };

    const showFooter = !!onFormSubmit;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>{isCreation ? "Создание нового бота" : "Основные настройки"}</CardTitle>
                <CardDescription>
                    {isCreation ? "Заполните информацию ниже, чтобы добавить нового бота в панель." : "Здесь вы можете изменить основные параметры бота."}
                </CardDescription>
            </CardHeader>
            
            <ScrollArea className="flex-grow">
                <CardContent className="space-y-4 px-6 pb-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Имя бота</Label>
                        <Input 
                            id="username" 
                            name="username" 
                            value={formData.username} 
                            onChange={handleChange} 
                            required 
                            className={usernameError ? 'border-red-500' : ''}
                        />
                        {usernameError && (
                            <p className="text-sm text-red-500">{usernameError}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note">Короткая заметка</Label>
                        <Input id="note" name="note" value={formData.note} onChange={handleChange} placeholder="Например, Масед 1" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Пароль (введите для изменения)</Label>
                        <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prefix">Префикс команд</Label>
                        <Input id="prefix" name="prefix" value={formData.prefix} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="serverId">Сервер</Label>
                        <Select name="serverId" value={formData.serverId} onValueChange={handleSelectChange} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите сервер" />
                            </SelectTrigger>
                            <SelectContent>
                                {servers.map(server => (
                                    <SelectItem key={server.id} value={server.id.toString()}>
                                        {server.name} ({server.host}:{server.port})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="my-6" />
                    
                    <div className="space-y-2">
                        <Label>Владельцы бота (Owners)</Label>
                        <DynamicInputList
                            value={formData.owners}
                            onChange={handleOwnersChange}
                            placeholder="Никнейм владельца"
                        />
                        <p className="text-sm text-muted-foreground">
                            Владельцы имеют полный доступ ко всем командам этого бота, игнорируя любые ограничения.
                        </p>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Настройки прокси (SOCKS5)</h3>
                        <p className="text-sm text-muted-foreground">Оставьте поля пустыми, если прокси не требуется.</p>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1"><Label htmlFor="proxyHost">Хост</Label><Input id="proxyHost" name="proxyHost" value={formData.proxyHost || ''} onChange={handleChange} placeholder="123.45.67.89" /></div>
                            <div className="space-y-1"><Label htmlFor="proxyPort">Порт</Label><Input id="proxyPort" name="proxyPort" type="number" value={formData.proxyPort || ''} onChange={handleChange} placeholder="1080" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label htmlFor="proxyUsername">Логин</Label><Input id="proxyUsername" name="proxyUsername" value={formData.proxyUsername || ''} onChange={handleChange} /></div>
                            <div className="space-y-1"><Label htmlFor="proxyPassword">Пароль прокси (введите для изменения)</Label><Input id="proxyPassword" name="proxyPassword" type="password" value={formData.proxyPassword} onChange={handleChange} placeholder="••••••••" /></div>
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>
            
            {showFooter && (
                 <CardFooter className="pt-6 border-t">
                    <Button type="submit" disabled={isSaving} className="w-full">
                        {isSaving ? "Сохранение..." : (isCreation ? "Создать бота" : "Сохранить изменения")}
                    </Button>
                </CardFooter>
            )}
        </form>
    );
}