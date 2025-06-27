import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { DialogTitle } from '@/components/ui/dialog';
import { apiHelper } from '@/lib/api';
import { Bot, Users, Puzzle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ bots: [], users: [], plugins: [] });
  const [isLoading, setIsLoading] = useState(false);

  const allBots = useAppStore((state) => state.bots);
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
      bots: 'Боты',
      users: 'Пользователи',
      plugins: 'Плагины',
    };
    return `${headings[key]} (${count})`;
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
      <CommandInput 
        placeholder="Искать ботов, плагины..." 
        value={query} 
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading ? (
            <div className="p-6 text-center text-sm">Загрузка...</div>
        ) : (
          <>
            <CommandEmpty>{query ? 'Ничего не найдено.' : 'Введите запрос для поиска.'}</CommandEmpty>
            
            {results.bots.length > 0 && (
              <CommandGroup heading={getHeading('bots')}>
                {results.bots.map((bot) => (
                  <CommandItem key={`bot-${bot.id}`} onSelect={() => runCommand(() => navigate(`/bots/${bot.id}`))}>
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
                  <CommandItem key={`user-${user.id}`} onSelect={() => runCommand(() => navigate(`/bots/${user.botId}/management`))}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>{user.username} (для бота ID: {user.botId})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.plugins.length > 0 && (
              <CommandGroup heading={getHeading('plugins')}>
                {results.plugins.map((plugin) => (
                  <CommandItem key={`plugin-${plugin.id}`} onSelect={() => runCommand(() => navigate(`/bots/${plugin.botId}/plugins`))}>
                    <Puzzle className="mr-2 h-4 w-4" />
                    <span>{plugin.name} (установлен у бота ID: {plugin.botId})</span>
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