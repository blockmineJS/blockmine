
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiHelper } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";

export default function UserFormDialog({ user, roles, onSubmit, onCancel, isSaving }) {
    const { t } = useTranslation('admin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState('');
    const [allBots, setAllBots] = useState(true);
    const [bots, setBots] = useState([]);
    const [selectedBotIds, setSelectedBotIds] = useState([]);
    const { toast } = useToast();

    const isEditMode = !!user;
    const isOwner = isEditMode && user?.id === 1;

    useEffect(() => {
        (async () => {
            try {
                const list = await apiHelper('/api/bots');
                setBots(list);
            } catch (e) {
            }
        })();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            setUsername(user.username);
            setRoleId(user.roleId.toString());
            setPassword('');
            setAllBots(user.allBots ?? true);
            const accessIds = Array.isArray(user.botAccess) ? user.botAccess.map(a => a.botId) : [];
            setSelectedBotIds(accessIds);
        } else {
            setUsername('');
            setPassword('');
            setRoleId(roles.length > 0 ? roles[0].id.toString() : '');
            setAllBots(true);
            setSelectedBotIds([]);
        }
    }, [user, roles, isEditMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username || !roleId) {
            toast({ variant: 'destructive', title: t('common.error'), description: t('userForm.validation.usernameRequired') });
            return;
        }
        if (!isEditMode && (!password || password.length < 4)) {
             toast({ variant: 'destructive', title: t('common.error'), description: t('userForm.validation.passwordRequired') });
            return;
        }
        if (isEditMode && password && password.length < 4) {
             toast({ variant: 'destructive', title: t('common.error'), description: t('userForm.validation.passwordMinLength') });
            return;
        }

        const dataToSubmit = { username, roleId: parseInt(roleId, 10), allBots, botIds: allBots ? [] : selectedBotIds };
        if (password) {
            dataToSubmit.password = password;
        }
        
        onSubmit(dataToSubmit, user?.id);
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditMode ? t('userForm.editTitle') : t('userForm.createTitle')}</DialogTitle>
                <DialogDescription>
                    {isEditMode ? t('userForm.editDescription', { name: user.username }) : t('userForm.createDescription')}
                </DialogDescription>
            </DialogHeader>
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="username">{t('userForm.username')}</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isEditMode} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">{isEditMode ? t('userForm.newPassword') : t('userForm.password')}</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="roleId">{t('userForm.role')}</Label>
                    <Select value={roleId} onValueChange={setRoleId} required>
                        <SelectTrigger><SelectValue placeholder={t('userForm.selectRole')} /></SelectTrigger>
                        <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox id="allBots" checked={allBots} onCheckedChange={(v) => setAllBots(!!v)} disabled={isOwner} />
                        <Label htmlFor="allBots">{t('userForm.allBotsAccess')} {isOwner ? t('userForm.ownerNote') : ''}</Label>
                    </div>
                    {!allBots && !isOwner && (
                        <div className="max-h-48 overflow-auto border rounded p-2 space-y-1">
                            {bots.map(b => {
                                const checked = selectedBotIds.includes(b.id);
                                return (
                                    <label key={b.id} className="flex items-center gap-2 text-sm">
                                        <input 
                                            type="checkbox" 
                                            checked={checked} 
                                            onChange={(e) => {
                                                setSelectedBotIds(prev => e.target.checked ? [...prev, b.id] : prev.filter(id => id !== b.id))
                                            }}
                                        />
                                        <span>{b.username}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </form>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>{t('userForm.cancel')}</Button>
                <Button type="submit" form="user-form" disabled={isSaving}>
                    {isSaving ? t('userForm.saving') : t('userForm.save')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}