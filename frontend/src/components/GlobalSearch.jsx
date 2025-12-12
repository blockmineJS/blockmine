import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiHelper } from '@/lib/api';
import { Bot, Users, Puzzle, LayoutDashboard, Clock, Server } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const GlobalSearch = () => {
  const { t } = useTranslation('dialogs');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ bots: [], users: [], plugins: [] });
  const [isLoading, setIsLoading] = useState(false);

  const allBots = useAppStore((state) => state.bots);
  const hasPermission = useAppStore((state) => state.hasPermission);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === ' ' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (query) {
      setIsLoading(true);
      const debounce = setTimeout(async () => {
        try {
          const data = await apiHelper(`/api/search?query=${encodeURIComponent(query)}`);
          setResults(data);
        } catch (error) {
          console.error('Search failed:', error);
          setResults({ bots: [], users: [], plugins: [] });
        } finally {
          setIsLoading(false);
        }
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setIsLoading(false);
      setResults({ bots: allBots, users: [], plugins: [] });
    }
  }, [query, open, allBots]);


  const runCommand = useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  const getHeading = (key) => {
    const count = results[key]?.length || 0;
    if (count === 0) return null;
    const headings = {
      bots: t('search.bots'),
      users: t('search.users'),
      plugins: t('search.plugins'),
    };
    return `${headings[key]} (${count})`;
  };
  
  const hasResults = Object.values(results).some(arr => arr.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <DialogTitle className="sr-only">{t('search.title')}</DialogTitle>
      <DialogDescription className="sr-only">
        {t('search.description')}
      </DialogDescription>
      <CommandInput
        placeholder={t('search.placeholder')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList key={query}>
        {isLoading ? (
            <div className="p-6 text-center text-sm">{t('search.loading')}</div>
        ) : (
          <>
            {!hasResults && query ? (<CommandEmpty>{t('search.noResults')}</CommandEmpty>) : null}
            
            {!query && (
                <CommandGroup heading={t('search.navigation')}>
                  <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>{t('search.dashboard')}</span>
                  </CommandItem>
                  {hasPermission('task:list') && (
                    <CommandItem onSelect={() => runCommand(() => navigate('/tasks'))}>
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{t('search.scheduler')}</span>
                    </CommandItem>
                  )}
                  {hasPermission('server:list') && (
                    <CommandItem onSelect={() => runCommand(() => navigate('/servers'))}>
                      <Server className="mr-2 h-4 w-4" />
                      <span>{t('search.servers')}</span>
                    </CommandItem>
                  )}
                </CommandGroup>
            )}
            
            {hasResults && !query && <div className="border-b my-1" />}
            
            {results.bots.length > 0 && (
              <CommandGroup heading={getHeading('bots')}>
                {results.bots.map((bot) => (
                  <CommandItem key={`bot-${bot.id}`} value={`bot-${bot.username}`} onSelect={() => runCommand(() => navigate(`/bots/${bot.id}`))}>
                    <Bot className="mr-2 h-4 w-4" />
                    <span>{bot.username}</span>
                    {bot.note && <span className="ml-2 text-xs text-muted-foreground">{bot.note}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.users.length > 0 && (
              <CommandGroup heading={getHeading('users')}>
                {results.users.map((user) => (
                  <CommandItem key={`user-${user.id}`} value={`user-${user.username}`} onSelect={() => runCommand(() => navigate(`/bots/${user.botId}/management`))}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>{user.username} ({t('search.forBotId', { botId: user.botId })})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.plugins.length > 0 && (
              <CommandGroup heading={getHeading('plugins')}>
                {results.plugins.map((plugin) => (
                  <CommandItem key={`plugin-${plugin.id}`} value={`plugin-${plugin.name}`} onSelect={() => runCommand(() => navigate(`/bots/${plugin.botId}/plugins`))}>
                    <Puzzle className="mr-2 h-4 w-4" />
                    <span>{plugin.name} ({t('search.installedForBotId', { botId: plugin.botId })})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;