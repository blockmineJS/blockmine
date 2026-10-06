import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiHelper } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { ExternalLink, Loader2 } from 'lucide-react';

const GITHUB_TOKEN_KEY = 'blockmine_github_token';

export default function PublishPluginDialog({ open, onClose, botId, plugin, onPublished }) {
  const { t } = useTranslation('plugins');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [icon, setIcon] = useState('package');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [device, setDevice] = useState(null);
  const [result, setResult] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!open || !plugin) return undefined;
    let stopped = false;
    const unknown = t('labels.unknownAuthor', { defaultValue: 'Неизвестный автор' });
    setAuthor(plugin.author && plugin.author !== unknown ? plugin.author : '');
    setDescription(plugin.description || '');
    setDisplayName(plugin.displayName || plugin.manifest?.displayName || '');
    setIcon(plugin.manifest?.icon || 'package');
    setToken(localStorage.getItem(GITHUB_TOKEN_KEY) || '');
    setDevice(null);
    setResult(null);
    setInfo(null);
    setBusy(false);
    apiHelper(`/api/bots/${botId}/plugins/ide/${encodeURIComponent(plugin.name)}/publish-info`)
      .then((payload) => {
        if (stopped) return;
        setInfo(payload);
        if (payload.author) setAuthor(payload.author);
        if (payload.description) setDescription(payload.description);
        if (payload.displayName) setDisplayName(payload.displayName);
        if (payload.icon) setIcon(payload.icon);
      })
      .catch(() => {
        if (!stopped) setInfo({ published: false });
      });
    return () => {
      stopped = true;
    };
  }, [botId, open, plugin, t]);

  useEffect(() => {
    if (!open || !device?.sessionId) return undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const status = await apiHelper(`/api/github/connect/${device.sessionId}`);
        if (stopped) return;
        if (status.status === 'ready' && status.token) {
          localStorage.setItem(GITHUB_TOKEN_KEY, status.token);
          setToken(status.token);
          setDevice(null);
          toast({ title: t('publish.githubReady', { defaultValue: 'GitHub привязан' }) });
        } else if (status.status === 'denied' || status.status === 'expired') {
          setDevice(null);
          toast({
            variant: 'destructive',
            title: t('publish.githubFailed', { defaultValue: 'GitHub не подтвердил вход' }),
          });
        }
      } catch {
        if (!stopped) setDevice(null);
      }
    };
    const timer = window.setInterval(tick, (device.interval || 5) * 1000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [device, open, t]);

  const startGithub = async () => {
    setBusy(true);
    try {
      const back = new URL(window.location.href);
      back.searchParams.delete('github_session');
      const started = await apiHelper('/api/github/connect/start', {
        method: 'POST',
        body: JSON.stringify({ returnUrl: back.toString() }),
      });
      if (!started.authorizeUrl) {
        throw new Error(t('publish.githubFailed', { defaultValue: 'GitHub не открылся' }));
      }
      window.location.assign(started.authorizeUrl);
    } catch (error) {
      setBusy(false);
      toast({
        variant: 'destructive',
        title: t('ui.error', { defaultValue: 'Ошибка' }),
        description: error.message,
      });
    }
  };

  const publish = async () => {
    if (!plugin) return;
    const githubToken = token.trim();
    if (!githubToken) {
      toast({
        variant: 'destructive',
        title: t('publish.needGithub', { defaultValue: 'Сначала нажмите «Подключить GitHub»' }),
      });
      return;
    }
    setBusy(true);
    try {
      const response = await apiHelper(`/api/bots/${botId}/plugins/ide/${encodeURIComponent(plugin.name)}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          token: githubToken,
          author: author.trim(),
          description: description.trim(),
          displayName: displayName.trim(),
          icon: icon.trim() || 'package',
        }),
      });
      localStorage.setItem(GITHUB_TOKEN_KEY, githubToken);
      setResult(response);
      onPublished?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('publish.failed', { defaultValue: 'Не удалось опубликовать' }),
        description: error.message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none border-l-4 border-l-primary sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('publish.title', { defaultValue: 'Опубликовать плагин' })}</DialogTitle>
          <DialogDescription className="max-w-sm">
            {info?.published
              ? t('publish.updateLead', { version: info.version, defaultValue: 'Уже на GitHub, сейчас {{version}}. Выпустит следующую версию и отправит её в неофициальный список.' })
              : t('publish.summary', { defaultValue: 'Репозиторий, релиз и сразу в неофициальный список.' })}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 border border-emerald-700/40 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm">
              {result.mode === 'updated'
                ? t('publish.updated', { version: result.tag, defaultValue: 'Новый релиз {{version}}.' })
                : t('publish.created', { version: result.tag, defaultValue: 'Репозиторий создан, релиз {{version}}.' })}
              {result.direct ? ` ${t('publish.listed', { defaultValue: 'Плагин уже в неофициальном списке.' })}` : ''}
            </p>
            {result.prSkipped ? (
              <p className="text-sm text-muted-foreground">
                {t('publish.officialSkip', { defaultValue: 'В официальном списке версия не сдвинулась. Её ставят вручную. Если там стоит latest, подтянется этот релиз.' })}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {result.repoUrl ? (
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <a href={result.repoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    {t('publish.openRepo', { defaultValue: 'Репозиторий' })}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border border-dashed px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {token
                    ? t('publish.githubReady', { defaultValue: 'GitHub подключён' })
                    : t('publish.github', { defaultValue: 'GitHub' })}
                </p>
                {device ? (
                  <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
                    {t('publish.waiting', { defaultValue: 'Если GitHub не открылся сам, нажмите кнопку ниже и подтвердите доступ.' })}
                  </p>
                ) : null}
                {device?.authorizeUrl ? (
                  <a
                    href={device.authorizeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block bg-primary px-3 py-2 text-sm text-primary-foreground"
                  >
                    {t('publish.openGithub', { defaultValue: 'Открыть GitHub' })}
                  </a>
                ) : null}
              </div>
              {!token ? (
                <Button type="button" size="sm" className="shrink-0 rounded-none" onClick={startGithub} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('publish.connect', { defaultValue: 'Подключить GitHub' })}
                </Button>
              ) : null}
            </div>

            {info?.published ? (
              <p className="border-l-2 border-primary px-3 text-sm text-muted-foreground">
                {info.repoUrl}
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <div>
                    <Label htmlFor="publish-name" className="mb-1 block">{t('publish.name', { defaultValue: 'Название' })}</Label>
                    <Input id="publish-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="publish-icon" className="mb-1 block">{t('publish.icon', { defaultValue: 'Иконка' })}</Label>
                    <Input id="publish-icon" className="rounded-none" value={icon} onChange={(event) => setIcon(event.target.value)} />
                    <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-primary underline">
                      {t('publish.iconSite', { defaultValue: 'Выбрать иконку' })}
                    </a>
                  </div>
                </div>
                <div>
                  <Label htmlFor="publish-author" className="mb-1 block">{t('publish.author', { defaultValue: 'Автор' })}</Label>
                  <Input id="publish-author" value={author} onChange={(event) => setAuthor(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="publish-description" className="mb-1 block">{t('publish.description', { defaultValue: 'Описание' })}</Label>
                  <Textarea id="publish-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel', { defaultValue: 'Отмена' })}</Button>
          {!result ? (
            <Button onClick={publish} disabled={busy} className="rounded-none">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {info?.published
                ? t('publish.release', { defaultValue: 'Выпустить версию' })
                : t('publish.submit', { defaultValue: 'Опубликовать' })}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
