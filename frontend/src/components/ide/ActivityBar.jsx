import React from 'react';
import { Files, Search, GitGraph, Settings, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const ActivityBarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <div
        className={cn(
            "w-12 h-12 flex items-center justify-center cursor-pointer transition-colors relative",
            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={onClick}
        title={label}
    >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
        <Icon className="w-6 h-6" />
    </div>
);

export default function ActivityBar({ activeView, onViewChange }) {
    return (
        <div className="w-12 flex flex-col border-r bg-muted/20 flex-shrink-0">
            <ActivityBarItem
                icon={Files}
                label="Explorer"
                isActive={activeView === 'explorer'}
                onClick={() => onViewChange('explorer')}
            />
            <ActivityBarItem
                icon={Search}
                label="Search"
                isActive={activeView === 'search'}
                onClick={() => onViewChange('search')}
            />
            <ActivityBarItem
                icon={Package}
                label="Plugin"
                isActive={activeView === 'plugin'}
                onClick={() => onViewChange('plugin')}
            />
            <ActivityBarItem
                icon={GitGraph}
                label="Source Control"
                isActive={activeView === 'git'}
                onClick={() => onViewChange('git')}
            />
            <div className="flex-grow" />
            <ActivityBarItem
                icon={Settings}
                label="Settings"
                isActive={activeView === 'settings'}
                onClick={() => onViewChange('settings')}
            />
        </div>
    );
}
