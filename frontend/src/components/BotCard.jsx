import React from 'react';

export default function BotCard({ bot, status, logs, onStart, onStop, onEdit, onDelete }) {
    const statusColor = status === 'running' ? 'text-green-500' : 'text-red-500';
    const isRunning = status === 'running';

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{bot.username}</h2>
                    <p className="text-sm text-gray-500">
                        {bot.server.name} ({bot.server.host}:{bot.server.port})
                    </p>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => onEdit(bot)}
                        disabled={isRunning}
                        className="text-sm bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Редактировать"
                    >
                        ✏️
                    </button>
                     <button 
                        onClick={() => onDelete(bot.id)}
                        disabled={isRunning}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Удалить"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            <div className="p-4 flex-grow">
                <p className="mb-4">
                    Статус: <span className={`font-semibold ${statusColor}`}>{status}</span>
                </p>
                
                <div className="bg-gray-900 text-white font-mono text-xs p-3 rounded-md h-48 overflow-y-auto flex flex-col-reverse">
                    <div className="flex-shrink-0">
                        {logs.map((log, index) => (
                            <p key={index} className="whitespace-pre-wrap">{log}</p>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-4">
                <button 
                    onClick={() => onStart(bot.id)}
                    disabled={isRunning}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                    Запустить
                </button>
                <button 
                    onClick={() => onStop(bot.id)}
                    disabled={!isRunning}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                >
                    Остановить
                </button>
            </div>
        </div>
    );
}