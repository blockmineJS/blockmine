import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiHelper, saveBlob } from '@/lib/api';

export default function PluginDownloadMenu({ botId, pluginId, pluginName, compact = false, className, showLabel = false, variant = 'outline' }) {
    const { t } = useTranslation('plugins');
    const [isDownloading, setIsDownloading] = useState(false);

    const download = async (withSettings) => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const query = withSettings ? '?settings=1' : '';
            const blob = await apiHelper(`/api/bots/${botId}/plugins/${pluginId}/download${query}`);
            if (blob instanceof Blob) {
                const suffix = withSettings ? '-settings' : '';
                saveBlob(blob, `${pluginName}${suffix}.zip`);
            }
        } catch {
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={compact ? 'icon' : 'sm'}
                    className={cn(compact ? 'h-8 w-8' : 'h-9', className)}
                    disabled={isDownloading}
                    aria-label={t('tooltips.downloadZip')}
                >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className={cn('h-4 w-4', showLabel && 'mr-2')} />}
                    {showLabel ? t('actions.downloadZip') : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onSelect={() => download(false)}>
                    {t('download.default')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => download(true)}>
                    {t('download.withSettings')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
