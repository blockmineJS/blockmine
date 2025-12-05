import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';

/**
 * Skeleton для элемента бота в сайдбаре
 */
export function BotSidebarItemSkeleton({ isCollapsed = false }) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs animate-pulse",
                isCollapsed && "justify-center"
            )}
        >
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Статус индикатор */}
                <Skeleton className="w-1.5 h-1.5 rounded-full" />

                {isCollapsed && (
                    /* Аватар (первая буква) */
                    <Skeleton className="w-5 h-5 rounded" />
                )}
            </div>

            {!isCollapsed && (
                <div className="flex flex-col overflow-hidden gap-1 flex-1">
                    {/* Имя бота */}
                    <Skeleton className="h-3 w-20" />
                    {/* Сервер/заметка */}
                    <Skeleton className="h-2.5 w-32" />
                </div>
            )}
        </div>
    );
}

/**
 * Skeleton для списка ботов в сайдбаре
 */
export function BotSidebarListSkeleton({ count = 3, isCollapsed = false }) {
    return (
        <div className="space-y-0.5">
            {Array.from({ length: count }).map((_, i) => (
                <BotSidebarItemSkeleton key={i} isCollapsed={isCollapsed} />
            ))}
        </div>
    );
}

/**
 * Skeleton для заголовка страницы бота
 */
export function BotViewHeaderSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 space-y-2">
                    {/* Имя бота */}
                    <Skeleton className="h-8 w-48" />

                    {/* Сервер и заметка */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-2 h-2 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                </div>

                {/* Статус badge */}
                <div className="ml-auto mt-2 sm:mt-0">
                    <Skeleton className="h-7 w-24 rounded-full" />
                </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {/* Навигационные табы */}
                <div className="flex items-center gap-1 bg-muted/50 border border-border/50 rounded-lg p-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-md" />
                    ))}
                </div>

                {/* Кнопки управления */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton для полного layout страницы бота
 */
export function BotViewFullSkeleton() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <header className="shrink-0 p-6 border-b">
                <BotViewHeaderSkeleton />
            </header>

            <main className="flex-grow min-h-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </main>
        </div>
    );
}

/**
 * Skeleton для карточки бота (если используется в grid view)
 */
export function BotCardSkeleton() {
    return (
        <div className="flex flex-col border rounded-lg p-4 space-y-4 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>

            {/* Console area */}
            <Skeleton className="h-48 w-full rounded" />

            {/* Buttons */}
            <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
            </div>
        </div>
    );
}

/**
 * Grid с карточками ботов
 */
export function BotCardGridSkeleton({ count = 6 }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {Array.from({ length: count }).map((_, i) => (
                <BotCardSkeleton key={i} />
            ))}
        </div>
    );
}
