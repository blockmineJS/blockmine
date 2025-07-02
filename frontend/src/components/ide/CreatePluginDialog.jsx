import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function CreatePluginDialog({ open, onOpenChange, onCreate }) {
    const [name, setName] = useState('');
    const [template, setTemplate] = useState('empty');

    const handleCreate = () => {
        if (name) {
            onCreate({ name, template });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Создать новый плагин</DialogTitle>
                    <DialogDescription>
                        Введите имя для нового плагина и выберите шаблон. Имя должно содержать только латинские буквы, цифры и дефисы.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Имя плагина</Label>
                        <Input 
                            id="name" 
                            value={name}
                            onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                            placeholder="my-cool-plugin"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Шаблон</Label>
                        <RadioGroup defaultValue="empty" value={template} onValueChange={setTemplate}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="empty" id="r1" />
                                <Label htmlFor="r1">Пустой плагин</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="command" id="r2" />
                                <Label htmlFor="r2">Плагин с командой</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button onClick={handleCreate} disabled={!name}>Создать и открыть</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 