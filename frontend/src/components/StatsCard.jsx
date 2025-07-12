import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, description, className }) {
    return (
        <Card className={cn(
            "transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-0 shadow-sm",
            className
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {Icon && (
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                        <Icon className="h-4 w-4 text-blue-500" />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {value}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}