import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowDownToLine,
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon,
  Github as GithubIcon,
  GitMerge as GitMergeIcon,
  Globe as GlobeIcon,
  Loader as LoaderIcon,
  Puzzle as PuzzleIcon,
  Server as ServerIcon,
  Sparkles as SparklesIcon,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { translatePluginCategory } from '@/utils/pluginPresentation';

const IconComponent = ({ name, ...props }) => {
  if (!name) return <PuzzleIcon {...props} />;
  if (name.startsWith('/') || name.startsWith('http')) return <img src={name} alt="plugin icon" {...props} />;

  const iconName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[iconName] || PuzzleIcon;
  return <LucideIcon {...props} />;
};

const getLatestVersion = (tag) => (tag || '0.0.0').replace(/^v/i, '');

const getSafeExternalUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

export default function PluginListItem({ plugin, isInstalled, isInstalling, onInstall, botId }) {
  const { t } = useTranslation('plugins');
  const hasDependencies = plugin.dependencies && plugin.dependencies.length > 0;
  const hasSupportedHosts = plugin.supportedHosts && plugin.supportedHosts.length > 0;
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const prevDownloads = useRef(plugin.downloads);
  const isPopular = plugin.isTop3;
  const safeRepoUrl = getSafeExternalUrl(plugin.repoUrl);
  const pluginDetailPath = `/bots/${botId}/plugins/view/${encodeURIComponent(plugin.name)}`;
  const authorLabel = plugin.author || t('labels.unknownAuthor', { defaultValue: 'Неизвестный автор' });
  const description = plugin.description || t('labels.noDescription', { defaultValue: 'Нет описания.' });

  useEffect(() => {
    if (plugin.downloads > prevDownloads.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      prevDownloads.current = plugin.downloads;
      return () => clearTimeout(timer);
    }

    if (plugin.downloads !== prevDownloads.current) {
      prevDownloads.current = plugin.downloads;
    }
  }, [plugin.downloads]);

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'plugin-card-hover relative flex items-start gap-4 rounded-lg border p-4 antialiased [text-rendering:optimizeLegibility] transition-all duration-300',
          'hover:border-primary/50 hover:bg-muted/50',
          isInstalled && 'border-green-600/30 bg-green-950/20'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            'relative mt-1 shrink-0 transition-[filter,transform,opacity] duration-300 ease-out',
            isHovered && 'scale-105'
          )}
        >
          <IconComponent
            name={plugin.icon}
            className={cn(
              'h-12 w-12 text-primary transition-[filter,color,opacity] duration-300 ease-out',
              isHovered && 'drop-shadow-glow'
            )}
          />
        </div>

        <div className="min-w-0 flex-grow">
          <div className="mb-2 flex items-start justify-between">
            <div className="min-w-0 flex-grow">
              <Link to={pluginDetailPath} className="group">
                <h3 className="inline-flex items-center gap-2 text-lg font-semibold transition-colors group-hover:text-primary">
                  {plugin.displayName || plugin.name}
                  {plugin.verified && <SparklesIcon className="h-4 w-4 text-blue-500" />}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {t('labels.by', { defaultValue: 'от' })}{' '}
                  <span className="font-medium text-primary/90">{authorLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>

          <div className="flex flex-wrap items-center gap-2">
            {plugin.categories?.slice(0, 3).map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {translatePluginCategory(category, t)}
              </Badge>
            ))}
            {(plugin.categories?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs">
                +{plugin.categories.length - 3}
              </Badge>
            )}

            {isPopular && (
              <Badge className="border-0 bg-gradient-to-r from-orange-500 to-red-500 text-xs text-white">
                <TrendingUpIcon className="mr-1 h-3 w-3" />
                {t('badges.popular', { defaultValue: 'Популярное' })}
              </Badge>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('transition-all duration-200', isAnimating && 'animate-bounce')}>
                  <Badge variant="outline" className="flex cursor-help items-center gap-1.5 px-2 py-0.5 text-xs">
                    <ArrowDownToLine className="h-3 w-3" />
                    <span className="font-semibold">{plugin.downloads || 0}</span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('labels.totalDownloads', { count: plugin.downloads || 0, defaultValue: 'Всего загрузок: {{count}}' })}</p>
              </TooltipContent>
            </Tooltip>

            {hasDependencies && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help border-orange-600/50 text-xs text-orange-600">
                    <GitMergeIcon className="mr-1 h-3 w-3" />
                    {plugin.dependencies.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{t('labels.requiredPlugins', { defaultValue: 'Требуются плагины:' })}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {plugin.dependencies.map((dependency) => (
                      <li key={dependency}>{dependency}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}

            {!hasSupportedHosts ? (
              <Badge variant="outline" className="text-xs">
                <GlobeIcon className="mr-1 h-3 w-3" />
                {t('labels.any', { defaultValue: 'Любой' })}
              </Badge>
            ) : plugin.supportedHosts.length <= 3 ? (
              plugin.supportedHosts.map((host) => (
                <Badge key={host} variant="outline" className="font-mono text-xs">
                  {host}
                </Badge>
              ))
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="cursor-help text-xs">
                    <ServerIcon className="mr-1 h-3 w-3" />
                    {plugin.supportedHosts.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{t('labels.testedOn', { defaultValue: 'Протестировано на:' })}</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {plugin.supportedHosts.map((host) => (
                      <li key={host}>{host}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="ml-4 flex shrink-0 flex-col items-end justify-center gap-2">
          <div className="flex items-center gap-2">
            {safeRepoUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={safeRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <GithubIcon className="h-5 w-5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('tooltips.openRepository', { defaultValue: 'Открыть репозиторий' })}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant={isInstalled ? 'secondary' : 'default'}
              disabled={isInstalled || isInstalling || !safeRepoUrl}
              onClick={() => {
                if (!safeRepoUrl) return;
                onInstall(plugin);
              }}
              className="min-w-[132px]"
            >
              {isInstalling ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  {t('messages.installing', { defaultValue: 'Установка...' })}
                </>
              ) : !safeRepoUrl ? (
                <>{t('actions.unavailable', { defaultValue: 'Недоступно' })}</>
              ) : isInstalled ? (
                <>
                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                  {t('status.installed', { defaultValue: 'Установлен' })}
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {t('actions.install', { defaultValue: 'Установить' })}
                </>
              )}
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">v{getLatestVersion(plugin.latestTag)}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
