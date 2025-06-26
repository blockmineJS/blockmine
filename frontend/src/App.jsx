
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import BotCard from './components/BotCard';
import BotForm from './components/BotForm';
import api from './lib/api';

const socket = io('http://localhost:3001');

function App() {
  const [bots, setBots] = useState([]);
  const [servers, setServers] = useState([]);
  const [botStates, setBotStates] = useState({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState(null);

  const fetchData = async () => {
    try {
      const [botsData, serversData] = await Promise.all([
        api.get('/bots'),
        api.get('/bots/servers')
      ]);
      
      setBots(botsData);
      setServers(serversData);

      setBotStates(prevStates => {
        const newStates = {};
        botsData.forEach(bot => {
          newStates[bot.id] = prevStates[bot.id] || { status: 'stopped', logs: [] };
        });
        return newStates;
      });
    } catch (error) {
      // Ошибка уже обрабатывается в api.js
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('bot:log', ({ botId, log }) => {
      setBotStates(prev => ({
        ...prev,
        [botId]: {
          ...prev[botId],
          logs: [log, ...(prev[botId]?.logs || []).slice(0, 99)],
        }
      }));
    });

    socket.on('bot:status', ({ botId, status, message }) => {
      setBotStates(prev => {
        const newLogs = message ? [message, ...(prev[botId]?.logs || []).slice(0, 99)] : (prev[botId]?.logs || []);
        return {
          ...prev,
          [botId]: {
            ...prev[botId],
            status: status,
            logs: newLogs,
          }
        };
      });
    });

    return () => {
      socket.off('bot:log');
      socket.off('bot:status');
    };
  }, []);
  
  const handleStartBot = async (botId) => {
    await api.post(`/bots/${botId}/start`);
  };

  const handleStopBot = async (botId) => {
    await api.post(`/bots/${botId}/stop`);
  };
  
  const handleDeleteBot = async (botId) => {
    if (window.confirm('Вы уверены, что хотите удалить этого бота?')) {
      const result = await api.delete(`/bots/${botId}`);
      if (result) {
        fetchData();
      }
    }
  };

  const handleOpenModal = (bot = null) => {
    setEditingBot(bot);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBot(null);
  };

  const handleSubmitBot = async (botData) => {
    const isEdit = !!editingBot;
    let result;
    if (isEdit) {
      result = await api.put(`/bots/${editingBot.id}`, botData);
    } else {
      result = await api.post('/bots', botData);
    }

    if (result) {
      fetchData();
      handleCloseModal();
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Панель управления ботами</h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            + Создать бота
          </button>
        </div>

        {isModalOpen && (
          <BotForm
            bot={editingBot}
            servers={servers}
            onSubmit={handleSubmitBot}
            onCancel={handleCloseModal}
          />
        )}

        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {bots.map(bot => (
            <BotCard
              key={bot.id}
              bot={bot}
              status={botStates[bot.id]?.status || 'unknown'}
              logs={botStates[bot.id]?.logs || []}
              onStart={handleStartBot}
              onStop={handleStopBot}
              onEdit={handleOpenModal}
              onDelete={handleDeleteBot}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;