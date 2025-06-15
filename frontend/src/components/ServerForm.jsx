import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ServerForm({ server, onSubmit, onCancel, isSaving }) {
    const [formData, setFormData] = useState({
        name: '',
        host: '',
        port: '25565',
        version: '',
    });

    useEffect(() => {
        if (server) {
            setFormData({
                name: server.name || '',
                host: server.host || '',
                port: server.port?.toString() || '25565',
                version: server.version || '',
            });
        }
    }, [server]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isEditMode = !!server;

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditMode ? 'Редактировать сервер' : 'Добавить новый сервер'}</DialogTitle>
                <DialogDescription>
                    Заполните информацию о сервере. Эти данные будут доступны при создании ботов.
                </DialogDescription>
            </DialogHeader>
            <form id="server-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Название сервера</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Например, mineblaze" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="host">Адрес (хост)</Label>
                    <Input id="host" name="host" value={formData.host} onChange={handleChange} placeholder="mc.mineblaze.net" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="port">Порт</Label>
                    <Input id="port" name="port" type="number" value={formData.port} onChange={handleChange} placeholder="25565" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="version">Версия Minecraft</Label>
                    <Input id="version" name="version" value={formData.version} onChange={handleChange} placeholder="1.20.1 самая стабильная" required />
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button type="submit" form="server-form" disabled={isSaving}>
                    {isSaving ? 'Сохранение...' : (isEditMode ? 'Сохранить' : 'Создать')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}