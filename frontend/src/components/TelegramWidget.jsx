import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TelegramWidget({ isCollapsed }) {
    const [membersCount, setMembersCount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMembers() {
            try {
                const response = await fetch('https://api.telegram.org/bot8062196096:AAH1bLASmX8oJFiTmPx0vB2t0oN6K_3pNjk/getChat?chat_id=@blockmineJs');
                if (response.ok) {
                    const data = await response.json();
                    if (data.ok && data.result) {
                        setMembersCount(data.result.member_count || data.result.members_count);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch Telegram members:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchMembers();
    }, []);

    return (
        <a
            href="https://t.me/blockmineJs"
            target="_blank"
            rel="noopener noreferrer"
            title={isCollapsed ? 'Telegram' : undefined}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                isCollapsed && "mx-auto h-9 w-9 justify-center px-0"
            )}
        >
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
            >
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className={cn("flex-1 truncate", isCollapsed && "hidden")}>Telegram</span>
            {isLoading ? (
                <span className="text-xs text-muted-foreground hidden sm:inline">...</span>
            ) : membersCount ? (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                    {membersCount.toLocaleString()}
                </span>
            ) : (
                <ExternalLink className="h-3 w-3 hidden sm:block" />
            )}
        </a>
    );
}
