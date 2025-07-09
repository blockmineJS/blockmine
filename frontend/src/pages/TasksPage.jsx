import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import TaskForm from '@/components/TaskForm';
import { useAppStore } from '@/stores/appStore';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { apiHelper } from '@/lib/api';

const cronInfoCache = new Map();

const CronInfo = ({ pattern, isEnabled, runOnStartup }) => {
    const [display, setDisplay] = useState({ nextRun: '...', human: '...' });

    useEffect(() => {
        const getCronDescription = async () => {
            if (!isEnabled) {
                setDisplay({ nextRun: 'Отключено', human: 'Отключено' });
                return;
            }

            if (runOnStartup && !pattern) {
                setDisplay({ nextRun: 'При старте', human: 'Выполняется при запуске панели' });
                return;
            }

            if (!pattern) {
                 setDisplay({ nextRun: 'n/a', human: 'Нет расписания' });
                 return;
            }

            const cacheKey = pattern;
            if (cronInfoCache.has(cacheKey)) {
                setDisplay(cronInfoCache.get(cacheKey));
                return;
            }

            try {
                const data = await apiHelper('/api/tasks/describe', {
                    method: 'POST',
                    body: JSON.stringify({ pattern }),
                });
                const newDisplay = { nextRun: data.next, human: data.human };
                
                cronInfoCache.set(cacheKey, newDisplay);
                setDisplay(newDisplay);

            } catch (err) {
                console.error(`Ошибка получения описания для "${pattern}":`, err);
                setDisplay({ nextRun: <span className="text-destructive">Ошибка</span>, human: pattern });
            }
        };

        getCronDescription();
    }, [pattern, isEnabled]);

    return (
        <>
            <TableCell>
                <div className="flex flex-col">
                    <span>{display.human}</span>
                    {pattern && <span className="text-xs text-muted-foreground font-mono">{pattern}</span>}
                </div>
            </TableCell>
            <TableCell>{display.nextRun}</TableCell>
        </>
    );
};


export default function TasksPage() {
    const { tasks, fetchTasks, createTask, updateTask, deleteTask } = useAppStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const [taskToDelete, setTaskToDelete] = useState(null);

    const normalizeCronPattern = (pattern) => {
        if (typeof pattern !== 'string') return '* * * * *';
        return pattern.replace(/\*\/1/g, '*').trim();
    };

    useEffect(() => {
        setIsLoading(true);
        fetchTasks().finally(() => setIsLoading(false));
    }, [fetchTasks]);

    const handleOpenModal = (task = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleSubmit = async (taskData) => {
        setIsSaving(true);
        const dataToSubmit = { ...taskData, cronPattern: normalizeCronPattern(taskData.cronPattern) };
        if (editingTask) {
            await updateTask(editingTask.id, dataToSubmit);
        } else {
            await createTask(dataToSubmit);
        }
        setIsSaving(false);
        handleCloseModal();
    };
    
    const handleConfirmDelete = async () => {
        if (taskToDelete) {
            await deleteTask(taskToDelete.id);
            setTaskToDelete(null);
        }
    };
    
    const handleToggle = async (task, isEnabled) => {
        const dataToUpdate = { ...task, isEnabled };
        delete dataToUpdate.id;
        
        await updateTask(task.id, dataToUpdate);
    };

    const actionLabels = {
        START_BOT: 'Запустить бота',
        STOP_BOT: 'Остановить бота',
        RESTART_BOT: 'Перезапустить бота',
        SEND_COMMAND: 'Отправить команду'
    };

    return (
        <div className="p-4 h-full">
            <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Планировщик задач</CardTitle>
                        <CardDescription>Автоматизируйте действия ботов с помощью cron-задач.</CardDescription>
                    </div>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenModal()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Создать задачу
                            </Button>
                        </DialogTrigger>
                        <TaskForm task={editingTask} onSubmit={handleSubmit} onCancel={handleCloseModal} isSaving={isSaving} />
                    </Dialog>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Статус</TableHead>
                                <TableHead>Название</TableHead>
                                <TableHead>Расписание</TableHead>
                                <TableHead>Следующий запуск</TableHead>
                                <TableHead>Действие</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : tasks.length > 0 ? (
                                tasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell><Switch checked={task.isEnabled} onCheckedChange={(checked) => handleToggle(task, checked)} /></TableCell>
                                        <TableCell className="font-medium">{task.name}</TableCell>
                                        
                                        <CronInfo pattern={task.cronPattern} isEnabled={task.isEnabled} runOnStartup={task.runOnStartup} />

                                        <TableCell><Badge variant="secondary">{actionLabels[task.action] || task.action}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(task)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setTaskToDelete(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Задачи не найдены.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <ConfirmationDialog
                open={!!taskToDelete}
                onOpenChange={() => setTaskToDelete(null)}
                title={`Удалить задачу "${taskToDelete?.name}"?`}
                description="Это действие необратимо и приведет к удалению задачи из расписания."
                onConfirm={handleConfirmDelete}
                confirmText="Да, удалить"
            />
        </div>
    );
}