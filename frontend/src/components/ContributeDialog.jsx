import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github } from 'lucide-react';

export default function ContributeDialog({ onClose }) {
    const { t } = useTranslation('dialogs');

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>{t('contribute.title')}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                    {t('contribute.guide')}
                </p>
                <p>
                    {t('contribute.description')}
                </p>

                <div className="border rounded-lg overflow-hidden mt-4">
                    <img
                        src="/create_issue.png"
                        alt={t('contribute.imageAlt')}
                        width="1263"
                        height="622"
                        className="w-full h-auto"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>{t('contribute.close')}</Button>
                <Button asChild>
                    <a href="https://github.com/blockmineJS/blockmine/issues/new/choose" target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        {t('contribute.goToGithub')}
                    </a>
                </Button>
            </DialogFooter>
        </DialogContent>
    );
} 