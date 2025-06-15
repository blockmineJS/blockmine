import React from 'react';
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle, PackageCheck } from "lucide-react";

const DependencyItem = ({ plugin, isInstalled }) => (
    <Card className={`p-3 transition-colors ${isInstalled ? "bg-muted/50 border-dashed" : ""}`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="font-semibold">{plugin.name}</p>
                <p className={`text-xs ${isInstalled ? "text-muted-foreground/80" : "text-muted-foreground"}`}>{plugin.description}</p>
            </div>
            {isInstalled ? (
                <PackageCheck className="h-6 w-6 text-green-500 shrink-0" />
            ) : (
                <Download className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
        </div>
    </Card>
);

export default function DependencyDialog({ mainPlugin, dependencies, onConfirm, onCancel, isInstalling }) {
    const toInstall = dependencies.filter(dep => !dep.isInstalled);
    const alreadyInstalled = dependencies.filter(dep => dep.isInstalled);

    return (
        <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
                <DialogTitle>Проверка зависимостей</DialogTitle>
                <DialogDescription>
                    Для установки <span className="font-semibold text-primary">{mainPlugin.name}</span> требуется несколько компонентов.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                
                {toInstall.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Необходимо установить:</h4>
                        <div className="space-y-2">
                            {toInstall.map(dep => <DependencyItem key={dep.id} plugin={dep} isInstalled={false} />)}
                        </div>
                    </div>
                )}

                {alreadyInstalled.length > 0 && (
                     <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-400">Уже установлено:</h4>
                        <div className="space-y-2">
                            {alreadyInstalled.map(dep => <DependencyItem key={dep.id} plugin={dep} isInstalled={true} />)}
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Отмена</Button>
                <Button onClick={onConfirm} disabled={isInstalling}>
                    {isInstalling ? "Установка..." : `Установить недостающие (${toInstall.length})`}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}