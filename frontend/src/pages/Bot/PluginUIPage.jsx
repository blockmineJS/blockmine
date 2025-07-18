import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiHelper } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PowerOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


const RecursiveRenderer = ({ schema, data, onAction, onDataChange, actionLoading }) => {
    if (!schema) return null;

    const renderChildren = (children) => children.map((child, i) => (
        <RecursiveRenderer key={i} schema={child} data={data} onAction={onAction} onDataChange={onDataChange} actionLoading={actionLoading} />
    ));
    
    const gridSpanClass = schema.gridSpan ? `md:col-span-${schema.gridSpan}` : '';

    switch (schema.type) {
        case 'Stack':
            return <div className={`flex flex-col gap-${schema.gap || 4} ${gridSpanClass}`}>{renderChildren(schema.children)}</div>;
        case 'Grid':
            return <div className={`grid grid-cols-1 md:grid-cols-${schema.columns || 2} gap-${schema.gap || 4} ${gridSpanClass}`}>{renderChildren(schema.children)}</div>;
        case 'Card':
            return <Card className={gridSpanClass}>{renderChildren(schema.children)}</Card>;
        case 'CardHeader':
            return <CardHeader><CardTitle>{schema.title}</CardTitle>{schema.description && <CardDescription>{schema.description}</CardDescription>}</CardHeader>;
        case 'CardContent':
            return <CardContent className="space-y-4 pt-4">{renderChildren(schema.children)}</CardContent>;
        case 'Tabs':
            return (
                <Tabs defaultValue={schema.defaultValue || schema.tabs[0]?.value} className={gridSpanClass}>
                    <TabsList className="grid w-full" style={{gridTemplateColumns: `repeat(${schema.tabs.length}, 1fr)`}}>{schema.tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}</TabsList>
                    {schema.tabs.map(tab => <TabsContent key={tab.value} value={tab.value} className="mt-4">{renderChildren(tab.children)}</TabsContent>)}
                </Tabs>
            );
        case 'Accordion':
             return <Accordion type="single" collapsible className={`w-full ${gridSpanClass}`}>{renderChildren(schema.children)}</Accordion>;
        case 'AccordionItem':
            return <AccordionItem value={schema.value}><AccordionTrigger>{schema.label}</AccordionTrigger><AccordionContent>{renderChildren(schema.children)}</AccordionContent></AccordionItem>;
        
        case 'Statistic':
            return <div className="p-2"><p className="text-sm text-muted-foreground">{schema.label}</p><p className="text-2xl font-bold">{data[schema.dataKey]}</p></div>;
        case 'Table':
            const tableData = data[schema.dataKey] || [];
            const rowKeyField = schema.rowKey || 'id';
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            {schema.columns.map(col => (
                                <TableHead key={col.dataKey || col.header}>{col.header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={schema.columns.length} className="text-center text-muted-foreground">
                                    Нет данных для отображения
                                </TableCell>
                            </TableRow>
                        ) : (
                            tableData.map((row, rowIndex) => {
                                const rowKey = row[rowKeyField] || rowIndex;
                                return (
                                    <TableRow key={rowKey}>
                                        {schema.columns.map(col => {
                                            if (col.type === 'actions' && col.actions) {
                                                return (
                                                    <TableCell key={col.dataKey || 'actions'}>
                                                        {col.actions.map(action => (
                                                            <Button
                                                                key={action.action}
                                                                size="sm"
                                                                variant={action.variant || 'outline'}
                                                                onClick={() => onAction(action.action, { [action.row_id_key]: row[action.row_id_key] })}
                                                                disabled={actionLoading === action.action}
                                                            >
                                                                {actionLoading === action.action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                {action.label}
                                                            </Button>
                                                        ))}
                                                    </TableCell>
                                                );
                                            }
                                            const cellValue = row[col.dataKey];
                                            return (
                                                <TableCell key={col.dataKey || col.header}>
                                                    {cellValue !== undefined ? String(cellValue) : '-'}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            );
        case 'LogViewer':
            return (
                <ScrollArea className="h-48 w-full rounded-md border bg-muted/50 p-4">
                    <div className="font-mono text-xs space-y-1">{(data[schema.dataKey] || []).slice(-100).map((log, i) => <p key={i}>{log}</p>)}</div>
                </ScrollArea>
            );
        case 'Markdown':
            return <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{data[schema.dataKey] || ''}</ReactMarkdown></div>
        case 'InventoryViewer':
            const inventoryItems = data[schema.dataKey] || [];
            return (
                <div className="space-y-3">
                    {inventoryItems.length > 0 ? (
                        inventoryItems.map((item, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-foreground">{item.name}</span>
                                    <span className="text-muted-foreground">{item.durability}</span>
                                </div>
                                <Progress value={item.percent} className="h-2" />
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Пусто</p>
                    )}
                </div>
            );

        case 'Button':
            return <Button variant={schema.variant || 'outline'} onClick={() => onAction(schema.action, data[schema.payloadKey])} disabled={actionLoading === schema.action || schema.disabled}>{actionLoading === schema.action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{schema.label}</Button>;
        case 'ToggleButton':
            const isLoading = actionLoading === schema.action;
            return <Button variant={data[schema.dataKey] ? 'destructive' : 'default'} onClick={() => onAction(schema.action)} disabled={isLoading || schema.disabled}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{data[schema.dataKey] ? schema.label_active : schema.label}</Button>;
        case 'Form':
            const handleFormSubmit = (e) => {
                e.preventDefault();
                const formData = {};
                schema.children.forEach(child => {
                    if(child.dataKey) formData[child.dataKey] = data[child.dataKey];
                });
                onAction(schema.action, formData);
            };
            return <form onSubmit={handleFormSubmit} className="space-y-4">{renderChildren(schema.children)}<Button type="submit" disabled={actionLoading === schema.action}>{actionLoading === schema.action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{schema.submitLabel || "Сохранить"}</Button></form>;
        
        case 'Input':
            return <div className="space-y-2"><Label htmlFor={schema.component_id}>{schema.label}</Label><Input id={schema.component_id} type={schema.inputType || 'text'} value={data[schema.dataKey] || ''} onChange={(e) => onDataChange(schema.dataKey, e.target.value)} /></div>;
        case 'Textarea':
            return <div className="space-y-2"><Label htmlFor={schema.component_id}>{schema.label}</Label><Textarea id={schema.component_id} value={data[schema.dataKey] || ''} onChange={(e) => onDataChange(schema.dataKey, e.target.value)} /></div>;
        case 'Select':
            return (
                <div className="space-y-2">
                    <Label htmlFor={schema.component_id}>{schema.label}</Label>
                    <Select value={data[schema.dataKey] || ''} onValueChange={(value) => onDataChange(schema.dataKey, value)}>
                        <SelectTrigger id={schema.component_id}><SelectValue placeholder={schema.placeholder} /></SelectTrigger>
                        <SelectContent>{(schema.options || []).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            );
        case 'Switch':
            return <div className="flex items-center space-x-2"><Switch id={schema.component_id} checked={!!data[schema.dataKey]} onCheckedChange={(checked) => onDataChange(schema.dataKey, checked)} /><Label htmlFor={schema.component_id}>{schema.label}</Label></div>;
        default:
            return <div className="text-red-500 font-bold p-2 bg-red-500/10 rounded-md">Неизвестный тип компонента: {schema.type}</div>;
    }
};

export default function PluginUIPage() {
    const { botId, pluginName, pluginPath } = useParams();
    const { toast } = useToast();
    const socket = useAppStore(state => state.socket);
    const botStatuses = useAppStore(state => state.botStatuses);
    const startBot = useAppStore(state => state.startBot);
    const navigate = useNavigate();

    const [pageSchema, setPageSchema] = useState(null);
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [isStartingBot, setIsStartingBot] = useState(false);

    const botStatus = botStatuses[parseInt(botId)];
    const isBotRunning = botStatus === 'running';
    const shouldShowStartMessage = !isBotRunning && !isStartingBot;

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiHelper(`/api/bots/${botId}/plugins/${pluginName}/ui-content/${pluginPath}`);
            setPageSchema(data.layout);
            setPageData(prevData => {
                if (!prevData) return data.data;
                const merged = { ...data.data };
                for (const key in prevData) {
                    if (Array.isArray(prevData[key]) && prevData[key].length > 0) {
                        merged[key] = prevData[key];
                    } else if (prevData[key] !== undefined && prevData[key] !== null) {
                        merged[key] = prevData[key];
                    }
                }
                return merged;
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить содержимое страницы плагина.' });
        } finally {
            setLoading(false);
        }
    }, [botId, pluginName, pluginPath, toast]);
    
    useEffect(() => {
        if (!socket) {
            fetchContent();
            return;
        }
        
        const handleDataUpdate = (update) => {
            setPageData(prevData => {
                if (!prevData) return update;
                
                let newData = { ...prevData };
                if (update.logMessage) {
                    const logKey = Object.keys(prevData).find(k => k.endsWith('logs'));
                    if (logKey) {
                        newData[logKey] = [...(prevData[logKey] || []), update.logMessage];
                    }
                }
                if (update && !update.logMessage) {
                    newData = { ...newData, ...update };
                }
                return newData;
            });
        };

        socket.on('plugin:ui:dataUpdate', handleDataUpdate);
        
        socket.emit('plugin:ui:subscribe', { botId: parseInt(botId), pluginName, path: pluginPath });
        
        setTimeout(() => {
            fetchContent();
        }, 100);

        return () => {
            socket.emit('plugin:ui:unsubscribe', { botId: parseInt(botId), pluginName, path: pluginPath });
            socket.off('plugin:ui:dataUpdate', handleDataUpdate);
        };
    }, [botId, pluginName, pluginPath, socket, fetchContent]);

    useEffect(() => {
        if (isBotRunning && isStartingBot) {
            const timer = setTimeout(() => {
                setIsStartingBot(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isBotRunning, isStartingBot]);

    const handleAction = async (actionName, payload = {}) => {
        setActionLoading(actionName);
        try {
            const response = await apiHelper(
                `/api/bots/${botId}/plugins/${pluginName}/action`,
                { method: 'POST', body: JSON.stringify({ actionName, payload }) }
            );
            
            toast({ title: "Успех!", description: response.message || 'Действие успешно выполнено.' });

            if (response.result) {
                setPageData(prevData => ({ ...prevData, ...response.result }));
            }
        } catch (error) {
        } finally {
            setActionLoading(null);
        }
    };
    
    const onDataChange = (key, value) => {
        setPageData(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    if (isStartingBot) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                    <h2 className="text-xl font-semibold text-muted-foreground">Запуск бота...</h2>
                    <p className="text-sm text-muted-foreground">
                        Пожалуйста, подождите, бот подключается к серверу.
                    </p>
                </div>
            </div>
        );
    }

    if (shouldShowStartMessage) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                    <PowerOff className="h-16 w-16 text-muted-foreground mx-auto" />
                    <h2 className="text-xl font-semibold text-muted-foreground">Бот не запущен</h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Для работы с интерфейсом плагина необходимо запустить бота. 
                    </p>
                    <Button 
                        onClick={async () => {
                            setIsStartingBot(true);
                            try {
                                await startBot(parseInt(botId));
                            } catch (error) {
                                setIsStartingBot(false);
                                toast({ 
                                    variant: 'destructive', 
                                    title: 'Ошибка', 
                                    description: 'Не удалось запустить бота.' 
                                });
                            }
                        }}
                        disabled={isStartingBot}
                        className="mt-4"
                    >
                        {isStartingBot && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isStartingBot ? 'Запуск...' : 'Запустить'}
                    </Button>
                </div>
            </div>
        );
    }

    if (!pageSchema || !pageData) {
        return <div className="p-4 text-center">Не удалось загрузить UI для этого плагина.</div>;
    }

    return (
        <div className="p-4">
            <RecursiveRenderer schema={pageSchema} data={pageData} onAction={handleAction} onDataChange={onDataChange} actionLoading={actionLoading}/>
        </div>
    );
}