import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const LANGUAGE_CHOSEN_KEY = 'blockmine-language-chosen';

const languages = [
  { code: 'ru', name: 'Русский', flagSrc: '/flags/ru.svg' },
  { code: 'en', name: 'English', flagSrc: '/flags/en.svg' },
];

export default function LanguageSwitcher({ isCollapsed }) {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleChangeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, 'true');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full transition-all",
            isCollapsed
              ? "h-9 w-9 p-0 justify-center"
              : "justify-start px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {isCollapsed ? (
            <img
              src={currentLang.flagSrc}
              alt={currentLang.name}
              className="w-6 h-4 object-cover rounded-sm shadow-sm"
            />
          ) : (
            <>
              <img
                src={currentLang.flagSrc}
                alt={currentLang.name}
                className="w-6 h-4 object-cover rounded-sm shadow-sm"
              />
              <span className="ml-2">{currentLang.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              i18n.language === lang.code && "bg-accent"
            )}
          >
            <img
              src={lang.flagSrc}
              alt={lang.name}
              className="w-7 h-5 object-cover rounded-sm shadow-sm"
            />
            <span className="flex-1">{lang.name}</span>
            {i18n.language === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
