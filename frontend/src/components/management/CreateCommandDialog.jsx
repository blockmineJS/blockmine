import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CreateCommandDialog = ({ open, onOpenChange, onCreate }) => {
  const { t } = useTranslation('management');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (name) {
      onCreate({ name, description });
      setName('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createCommand.title')}</DialogTitle>
          <DialogDescription>
            {t('createCommand.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              {t('createCommand.name')}
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">
              {t('createCommand.commandDescription')}
            </Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate}>{t('createCommand.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
