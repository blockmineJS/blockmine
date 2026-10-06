import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/appStore';

export default function UnlistCatalogButton({ plugin, className }) {
  const { t } = useTranslation('plugins');
  const fetchPluginCatalog = useAppStore((state) => state.fetchPluginCatalog);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (plugin?.listing !== 'unofficial') return null;

  const removeFromList = async () => {
    const token = localStorage.getItem('blockmine_github_token');
    setBusy(true);
    try {
      await apiHelper(`/api/plugins/catalog/${encodeURIComponent(plugin.name)}/unlist`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      toast({ title: t('unlist.done') });
      fetchPluginCatalog(true);
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: error.message || t('unlist.failed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        {t('tooltips.unlist')}
      </Button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={t('unlist.title', { name: plugin.displayName || plugin.name })}
        onConfirm={removeFromList}
        confirmText={busy ? t('unlist.working') : t('unlist.confirm')}
      />
    </>
  );
}
