import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Download, PackageCheck } from 'lucide-react';

const DependencyItem = ({ plugin, isInstalled }) => (
  <Card className={`p-3 transition-colors ${isInstalled ? 'border-dashed bg-muted/50' : ''}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold">{plugin.name}</p>
        <p className={`text-xs ${isInstalled ? 'text-muted-foreground/80' : 'text-muted-foreground'}`}>
          {plugin.description}
        </p>
      </div>
      {isInstalled ? (
        <PackageCheck className="h-6 w-6 shrink-0 text-green-500" />
      ) : (
        <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </div>
  </Card>
);

export default function DependencyDialog({ mainPlugin, dependencies, onConfirm, onCancel, isInstalling }) {
  const { t } = useTranslation('plugins');
  const toInstall = dependencies.filter((dependency) => !dependency.isInstalled);
  const alreadyInstalled = dependencies.filter((dependency) => dependency.isInstalled);

  return (
    <DialogContent className="sm:max-w-[525px]">
      <DialogHeader>
        <DialogTitle>{t('dependencyDialog.title', { defaultValue: 'Проверка зависимостей' })}</DialogTitle>
        <DialogDescription>
          {t('dependencyDialog.description', {
            name: mainPlugin.name,
            defaultValue: 'Для установки {{name}} требуется несколько компонентов.',
          })}
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-2">
        {toInstall.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-amber-400">
              {t('dependencyDialog.toInstall', { defaultValue: 'Необходимо установить:' })}
            </h4>
            <div className="space-y-2">
              {toInstall.map((dependency) => (
                <DependencyItem key={dependency.id} plugin={dependency} isInstalled={false} />
              ))}
            </div>
          </div>
        )}

        {alreadyInstalled.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-400">
              {t('dependencyDialog.alreadyInstalled', { defaultValue: 'Уже установлено:' })}
            </h4>
            <div className="space-y-2">
              {alreadyInstalled.map((dependency) => (
                <DependencyItem key={dependency.id} plugin={dependency} isInstalled />
              ))}
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          {t('actions.cancel', { defaultValue: 'Отмена' })}
        </Button>
        <Button onClick={onConfirm} disabled={isInstalling}>
          {isInstalling
            ? t('dependencyDialog.installing', { defaultValue: 'Установка...' })
            : t('dependencyDialog.installMissing', {
                count: toInstall.length,
                defaultValue: 'Установить недостающие ({{count}})',
              })}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
