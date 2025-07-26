import React from 'react';
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
    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Предложить улучшение или задать вопрос</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                    Здесь небольшой гайд о том, как задавать/предлагать свои запросы правильно.
                </p>
                <p>
                    Для того чтобы задать вопрос, сообщить об ошибке или предложить новую идею, перейдите на нашу страницу GitHub Issues.
                    Нажмите на кнопку "New issue" и выберите подходящий шаблон. Для обычного вопроса можно создать пустой issue.
                </p>
                
                <div className="border rounded-lg overflow-hidden mt-4">
                    <img 
                        src="/create_issue.png" 
                        alt="How to create a GitHub issue"
                        width="1263"
                        height="622"
                        className="w-full h-auto"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>Закрыть</Button>
                <Button asChild>
                    <a href="https://github.com/blockmineJS/blockmine/issues/new/choose" target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        Перейти на GitHub
                    </a>
                </Button>
            </DialogFooter>
        </DialogContent>
    );
} 