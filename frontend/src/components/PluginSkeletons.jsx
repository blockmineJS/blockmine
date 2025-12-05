import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';

/**
 * Skeleton для карточки плагина в grid режиме
 */
export function PluginCardSkeleton() {
    return (
        <Card className="relative overflow-hidden h-full flex flex-col animate-pulse">
            {/* Верхняя полоска */}
            <div className="absolute top-0 left-0 w-full h-1">
                <Skeleton className="h-full w-full" />
            </div>

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Иконка */}
                        <Skeleton className="h-10 w-10 rounded-md shrink-0" />

                        <div className="min-w-0 flex-1 space-y-2">
                            {/* Название */}
                            <Skeleton className="h-5 w-32" />
                            {/* Автор */}
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    {/* Switch */}
                    <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3 pb-3">
                {/* Описание */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                </div>

                {/* Команды/Графы */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-3" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>

                {/* Дата обновления */}
                <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </CardContent>

            <CardFooter className="pt-3 border-t space-y-3">
                <div className="grid grid-cols-2 gap-2 w-full">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                </div>
            </CardFooter>
        </Card>
    );
}

/**
 * Skeleton для элемента плагина в list режиме
 */
export function PluginListItemSkeleton() {
    return (
        <div className="relative flex items-start gap-4 p-4 border rounded-lg animate-pulse h-full">
            {/* Левая полоска */}
            <div className="absolute top-0 left-0 w-1 h-full">
                <Skeleton className="h-full w-full" />
            </div>

            {/* Иконка */}
            <Skeleton className="h-10 w-10 rounded-md shrink-0 mt-1" />

            {/* Основной контент */}
            <div className="flex-grow min-w-0 space-y-2">
                {/* Название и badges */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-16" />
                </div>

                {/* Автор */}
                <Skeleton className="h-4 w-40" />

                {/* Описание */}
                <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Badges и метаданные */}
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Кнопки справа */}
            <div className="flex items-center gap-2 shrink-0 ml-4">
                <div className="flex gap-1">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full ml-2" />
            </div>
        </div>
    );
}

/**
 * Skeleton для карточки плагина в магазине (grid режим)
 */
export function PluginStoreCardSkeleton() {
    return (
        <Card className="relative overflow-hidden h-full flex flex-col animate-pulse hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    {/* Иконка */}
                    <Skeleton className="h-12 w-12 rounded-md shrink-0" />

                    <div className="flex-1 space-y-2">
                        {/* Название */}
                        <Skeleton className="h-5 w-full" />
                        {/* Автор */}
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
                {/* Описание */}
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                </div>

                {/* Статистика */}
                <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-3 border-t">
                <Skeleton className="h-9 w-full" />
            </CardFooter>
        </Card>
    );
}

/**
 * Skeleton для элемента плагина в магазине (list режим)
 */
export function PluginStoreListItemSkeleton() {
    return (
        <div className="flex items-start gap-4 p-4 border rounded-lg animate-pulse hover:shadow-md transition-all h-full">
            {/* Иконка */}
            <Skeleton className="h-12 w-12 rounded-md shrink-0 mt-1" />

            {/* Основной контент */}
            <div className="flex-grow min-w-0 space-y-2">
                {/* Название */}
                <Skeleton className="h-6 w-48" />

                {/* Автор */}
                <Skeleton className="h-4 w-32" />

                {/* Описание */}
                <div className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>

                {/* Badges и метаданные */}
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Кнопка установки */}
            <div className="shrink-0 ml-4">
                <Skeleton className="h-9 w-32" />
            </div>
        </div>
    );
}

/**
 * Контейнер для отображения множества skeleton элементов
 */
export function PluginSkeletonGrid({ count = 8, viewMode = 'grid', type = 'installed' }) {
    const SkeletonComponent = viewMode === 'grid'
        ? (type === 'store' ? PluginStoreCardSkeleton : PluginCardSkeleton)
        : (type === 'store' ? PluginStoreListItemSkeleton : PluginListItemSkeleton);

    if (viewMode === 'list') {
        return (
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonComponent key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonComponent key={i} />
                ))}
            </div>
        </div>
    );
}
