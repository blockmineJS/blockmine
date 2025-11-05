import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    className, 
    iconClassName,
    trend, // 'up', 'down', 'neutral'
    trendValue, // "+12%", "-5%"
    borderColor,
    onClick
}) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 500;
        const steps = 20;
        const increment = value / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

    return (
        <Card 
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-xl border-l-4",
                borderColor || "border-l-transparent",
                onClick && "cursor-pointer active:scale-[0.98]",
                className
            )}
            onClick={onClick}
        >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && (
                    <div className={cn(
                        "p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors",
                        iconClassName && "bg-transparent"
                    )}>
                        <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", iconClassName)} />
                    </div>
                )}
            </CardHeader>
            
            <CardContent className="relative">
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold tracking-tight">
                        {displayValue}
                    </div>
                    {trendValue && (
                        <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                            <TrendIcon className="h-3 w-3" />
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}