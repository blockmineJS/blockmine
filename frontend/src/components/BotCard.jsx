import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleIcon from '@mui/icons-material/StopCircle';

export default function BotCard({ bot, status, logs, onStart, onStop, onEdit, onDelete }) {
    const isRunning = status === 'running';
    const statusColor = isRunning ? 'success' : 'error';

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', marginBottom: 2 }}>
            <CardHeader
                title={bot.username}
                subheader={`${bot.server.name} (${bot.server.host}:${bot.server.port})`}
                action={
                    <div>
                        <Tooltip title="Редактировать">
                            <IconButton onClick={() => onEdit(bot)} disabled={isRunning}>
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                            <IconButton onClick={() => onDelete(bot.id)} disabled={isRunning}>
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </div>
                }
            />
            <CardContent sx={{ flexGrow: 1 }}>
                <p>Статус: <span style={{ fontWeight: 'bold', color: statusColor === 'success' ? '#4caf50' : '#f44336' }}>{status}</span></p>
                <div style={{ backgroundColor: '#1a202c', color: '#fff', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.75rem', borderRadius: '0.375rem', height: '12rem', overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
                    {logs.map((log, index) => (
                        <p key={index} style={{ whiteSpace: 'pre-wrap' }}>{log}</p>
                    ))}
                </div>
            </CardContent>
            <CardActions>
                <Button
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => onStart(bot.id)}
                    disabled={isRunning}
                    variant="contained"
                    color="primary"
                    sx={{ width: '50%' }}
                >
                    Запустить
                </Button>
                <Button
                    startIcon={<StopCircleIcon />}
                    onClick={() => onStop(bot.id)}
                    disabled={!isRunning}
                    variant="contained"
                    color="error"
                    sx={{ width: '50%' }}
                >
                    Остановить
                </Button>
            </CardActions>
        </Card>
    );
}
