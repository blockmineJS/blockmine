import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const ShortcutRow = ({ keys, description, mac = false }) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const displayKeys = mac && isMac ? keys.replace('Ctrl', '⌘') : keys;

    return (
        <div className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{description}</span>
            <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">
                {displayKeys}
            </kbd>
        </div>
    );
};

const KeyboardShortcutsHelp = ({ isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Горячие клавиши
                    </DialogTitle>
                    <DialogDescription>
                        Список всех доступных горячих клавиш в IDE
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* General */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Общие
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Ctrl+S" description="Сохранить файл" mac />
                            <ShortcutRow keys="Ctrl+W" description="Закрыть вкладку" mac />
                            <ShortcutRow keys="Ctrl+N" description="Новый файл" mac />
                            <ShortcutRow keys="Ctrl+P" description="Быстрое открытие файла" mac />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Навигация
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Ctrl+B" description="Показать/скрыть боковую панель" mac />
                            <ShortcutRow keys="Ctrl+`" description="Показать/скрыть терминал" mac />
                            <ShortcutRow keys="Ctrl+Shift+E" description="Открыть Explorer" mac />
                            <ShortcutRow keys="Ctrl+Shift+F" description="Глобальный поиск" mac />
                            <ShortcutRow keys="Ctrl+Tab" description="Следующая вкладка" mac />
                            <ShortcutRow keys="Ctrl+Shift+Tab" description="Предыдущая вкладка" mac />
                        </div>
                    </div>

                    {/* Editor */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Редактор
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Ctrl+F" description="Найти в файле" mac />
                            <ShortcutRow keys="Ctrl+H" description="Найти и заменить" mac />
                            <ShortcutRow keys="Ctrl+/" description="Закомментировать строку" mac />
                            <ShortcutRow keys="Ctrl+D" description="Добавить следующее вхождение" mac />
                            <ShortcutRow keys="Alt+↑/↓" description="Переместить строку" />
                            <ShortcutRow keys="Shift+Alt+↑/↓" description="Скопировать строку" />
                            <ShortcutRow keys="Ctrl+Shift+K" description="Удалить строку" mac />
                            <ShortcutRow keys="Ctrl+Enter" description="Вставить строку ниже" mac />
                            <ShortcutRow keys="Ctrl+Shift+Enter" description="Вставить строку выше" mac />
                        </div>
                    </div>

                    {/* Multi-cursor */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Мультикурсор
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Alt+Click" description="Добавить курсор" />
                            <ShortcutRow keys="Ctrl+Alt+↑/↓" description="Добавить курсор выше/ниже" mac />
                            <ShortcutRow keys="Ctrl+D" description="Выделить следующее вхождение" mac />
                            <ShortcutRow keys="Ctrl+Shift+L" description="Выделить все вхождения" mac />
                        </div>
                    </div>

                    {/* Code */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Код
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Ctrl+Space" description="Автодополнение" mac />
                            <ShortcutRow keys="Ctrl+Shift+Space" description="Подсказка параметров" mac />
                            <ShortcutRow keys="F2" description="Переименовать символ" />
                            <ShortcutRow keys="F12" description="Перейти к определению" />
                            <ShortcutRow keys="Shift+F12" description="Найти все ссылки" />
                            <ShortcutRow keys="Ctrl+Shift+O" description="Перейти к символу в файле" mac />
                        </div>
                    </div>

                    {/* View */}
                    <div>
                        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                            Вид
                        </h3>
                        <div className="space-y-1">
                            <ShortcutRow keys="Ctrl++" description="Увеличить масштаб" mac />
                            <ShortcutRow keys="Ctrl+-" description="Уменьшить масштаб" mac />
                            <ShortcutRow keys="Ctrl+0" description="Сбросить масштаб" mac />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default KeyboardShortcutsHelp;
