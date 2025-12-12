import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';

const LANGUAGE_STORAGE_KEY = 'blockmine-language';
const LANGUAGE_CHOSEN_KEY = 'blockmine-language-chosen';

const languages = [
  {
    code: 'ru',
    name: 'Русский',
    nativeName: 'Russian',
    flagSrc: '/flags/ru.svg',
    greeting: 'Добро пожаловать!',
    description: 'Русский язык интерфейса',
    gradient: 'from-blue-500 via-blue-600 to-red-500',
    bgGradient: 'from-blue-500/10 to-red-500/10',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'Английский',
    flagSrc: '/flags/en.svg',
    greeting: 'Welcome!',
    description: 'English interface language',
    gradient: 'from-blue-600 via-red-500 to-blue-600',
    bgGradient: 'from-blue-500/10 to-red-500/10',
  },
];

export default function LanguageSelectModal() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Проверяем, выбирал ли пользователь язык явно
    const hasChosen = localStorage.getItem(LANGUAGE_CHOSEN_KEY);

    if (!hasChosen) {
      // Если пользователь ещё не выбирал язык, показываем модалку
      setIsOpen(true);
    }
  }, []);

  const handleSelectLanguage = (langCode) => {
    setSelectedLang(langCode);
  };

  const handleConfirm = async () => {
    if (!selectedLang) return;

    setIsAnimating(true);

    // Меняем язык
    await i18n.changeLanguage(selectedLang);

    // Сохраняем в localStorage (i18n делает это автоматически, но для надёжности)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLang);

    // Отмечаем что пользователь явно выбрал язык
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, 'true');

    // Небольшая задержка для анимации
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-0 bg-gradient-to-br from-background via-background to-muted/30 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Декоративные элементы */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

        <DialogHeader className="text-center space-y-4 relative">
          {/* Флаги */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-lg overflow-hidden">
            {selectedLang ? (
              // Показываем выбранный флаг
              <img
                src={languages.find(l => l.code === selectedLang)?.flagSrc}
                alt={selectedLang}
                className="w-12 h-9 object-cover rounded shadow-sm animate-in zoom-in-50 duration-300"
              />
            ) : (
              // Показываем оба флага
              <div className="flex items-center -space-x-2">
                <img
                  src="/flags/ru.svg"
                  alt="Russian"
                  className="w-10 h-7 object-cover rounded shadow-sm transform -rotate-12 hover:rotate-0 transition-transform"
                />
                <img
                  src="/flags/en.svg"
                  alt="English"
                  className="w-10 h-7 object-cover rounded shadow-sm transform rotate-12 hover:rotate-0 transition-transform"
                />
              </div>
            )}
          </div>

          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Choose Your Language
          </DialogTitle>

          <DialogDescription className="text-muted-foreground">
            Выберите язык интерфейса
          </DialogDescription>
        </DialogHeader>

        {/* Карточки языков */}
        <div className="grid grid-cols-2 gap-4 py-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={cn(
                "relative group p-4 rounded-xl border-2 transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
                selectedLang === lang.code
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/50 hover:border-primary/30 bg-card/50"
              )}
            >
              {/* Галочка выбора */}
              {selectedLang === lang.code && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}

              {/* Флаг */}
              <div className={cn(
                "mb-3 transition-transform duration-300",
                "group-hover:scale-110",
                selectedLang === lang.code && "scale-110"
              )}>
                <img
                  src={lang.flagSrc}
                  alt={lang.name}
                  className="w-16 h-12 object-cover rounded-md shadow-md"
                />
              </div>

              {/* Название */}
              <div className="space-y-1">
                <div className={cn(
                  "font-semibold text-lg transition-colors",
                  selectedLang === lang.code ? "text-primary" : "text-foreground"
                )}>
                  {lang.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lang.nativeName}
                </div>
              </div>

              {/* Приветствие при наведении */}
              <div className={cn(
                "mt-3 text-sm font-medium opacity-0 translate-y-2 transition-all duration-300",
                "group-hover:opacity-100 group-hover:translate-y-0",
                selectedLang === lang.code && "opacity-100 translate-y-0 text-primary"
              )}>
                {lang.greeting}
              </div>

              {/* Градиентная подсветка */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                `bg-gradient-to-br ${lang.bgGradient}`,
                "group-hover:opacity-100",
                selectedLang === lang.code && "opacity-100"
              )} style={{ zIndex: -1 }} />
            </button>
          ))}
        </div>

        {/* Кнопка подтверждения */}
        <Button
          onClick={handleConfirm}
          disabled={!selectedLang || isAnimating}
          className={cn(
            "w-full h-12 text-base font-medium transition-all duration-300",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
            !selectedLang && "opacity-50 cursor-not-allowed"
          )}
        >
          {isAnimating ? (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Loading...</span>
            </div>
          ) : (
            <span>
              {selectedLang === 'ru' ? 'Продолжить' : selectedLang === 'en' ? 'Continue' : 'Select language'}
            </span>
          )}
        </Button>

        {/* Подсказка */}
        <p className="text-xs text-center text-muted-foreground/60">
          You can change the language later in settings
          <br />
          <span className="text-muted-foreground/40">Вы можете изменить язык позже в настройках</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
