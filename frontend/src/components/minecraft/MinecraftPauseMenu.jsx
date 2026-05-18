import React, { useState } from 'react';

/**
 * Pause-меню в стиле Minecraft:
 * - Открывается по ESC
 * - Полупрозрачный фон, кнопки в Minecraft-стиле
 * - Кнопка "Options" открывает sub-меню настроек
 */

const MCButton = ({ onClick, disabled, children, width = 200, danger }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="relative transition-transform active:scale-95"
        style={{
            width,
            height: 40,
            background: disabled
                ? 'linear-gradient(180deg, #4a4a4a 0%, #383838 50%, #2a2a2a 100%)'
                : danger
                    ? 'linear-gradient(180deg, #6b1a1a 0%, #4a1010 50%, #340a0a 100%)'
                    : 'linear-gradient(180deg, #6e6e6e 0%, #555 50%, #3f3f3f 100%)',
            border: '2px solid #000',
            color: disabled ? '#888' : '#fff',
            fontFamily: '"Minecraft", "Press Start 2P", monospace',
            fontSize: 14,
            textShadow: '2px 2px 0 #3f3f3f',
            imageRendering: 'pixelated',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
            if (!disabled) {
                e.currentTarget.style.background = danger
                    ? 'linear-gradient(180deg, #882020 0%, #5a1414 50%, #400e0e 100%)'
                    : 'linear-gradient(180deg, #8c8c8c 0%, #6b6b6b 50%, #525252 100%)';
                e.currentTarget.style.borderColor = '#fff';
            }
        }}
        onMouseLeave={(e) => {
            if (!disabled) {
                e.currentTarget.style.background = danger
                    ? 'linear-gradient(180deg, #6b1a1a 0%, #4a1010 50%, #340a0a 100%)'
                    : 'linear-gradient(180deg, #6e6e6e 0%, #555 50%, #3f3f3f 100%)';
                e.currentTarget.style.borderColor = '#000';
            }
        }}
    >
        {children}
    </button>
);

const Slider = ({ label, value, min, max, step, onChange, format }) => (
    <div className="flex flex-col gap-1">
        <div
            className="text-white text-xs"
            style={{
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                textShadow: '1px 1px 0 #3f3f3f'
            }}
        >
            {label}: <span style={{ color: '#a0ffa0' }}>{format ? format(value) : value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: '#5fff5f' }}
        />
    </div>
);

const Toggle = ({ label, value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        className="text-left transition-transform active:scale-95"
        style={{
            width: '100%',
            height: 32,
            background: value
                ? 'linear-gradient(180deg, #4a8a4a 0%, #3a6a3a 50%, #2a4a2a 100%)'
                : 'linear-gradient(180deg, #6e6e6e 0%, #555 50%, #3f3f3f 100%)',
            border: '2px solid #000',
            color: '#fff',
            fontFamily: '"Minecraft", "Press Start 2P", monospace',
            fontSize: 11,
            textShadow: '1px 1px 0 #3f3f3f',
            padding: '0 12px',
            cursor: 'pointer',
        }}
    >
        {label}: {value ? 'ON' : 'OFF'}
    </button>
);

const SettingsView = ({ settings, updateSetting, onBack, scoreboardVisible, setScoreboardVisible, gameInfo }) => (
    <div className="flex flex-col gap-2" style={{ width: 420 }}>
        <h2
            className="text-center text-white text-xl mb-3"
            style={{
                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                textShadow: '2px 2px 0 #3f3f3f'
            }}
        >
            Настройки
        </h2>

        <div className="grid grid-cols-2 gap-2">
            <Slider
                label="Дальность прорисовки"
                value={settings.renderDistance}
                min={8} max={64} step={4}
                onChange={(v) => updateSetting('renderDistance', v)}
                format={(v) => `${v} чанк.`}
            />
            <Slider
                label="Чувствительность"
                value={settings.sensitivity}
                min={0.2} max={3} step={0.1}
                onChange={(v) => updateSetting('sensitivity', v)}
                format={(v) => `${v.toFixed(1)}x`}
            />
            <Slider
                label="Сила синхрон."
                value={settings.correctionSpeed}
                min={0.2} max={3} step={0.1}
                onChange={(v) => updateSetting('correctionSpeed', v)}
                format={(v) => `${v.toFixed(1)}x`}
            />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
            <Toggle label="Скорборд"
                value={scoreboardVisible}
                onChange={setScoreboardVisible} />
            <Toggle label="Сглаживание (FXAA)"
                value={!!settings.fxaa}
                onChange={(v) => updateSetting('fxaa', v)} />
            <Toggle label="Освещение"
                value={!!settings.dynamicLighting}
                onChange={(v) => updateSetting('dynamicLighting', v)} />
            <Toggle label="Frustum culling"
                value={settings.frustumCulling !== false}
                onChange={(v) => updateSetting('frustumCulling', v)} />
            <Toggle label="Instanced render"
                value={settings.instancedRendering !== false}
                onChange={(v) => updateSetting('instancedRendering', v)} />
            <Toggle label="Замедл. в фоне"
                value={!!settings.throttleWhenHidden}
                onChange={(v) => updateSetting('throttleWhenHidden', v)} />
            <Toggle label="Локальное движение"
                value={!!settings.localMovement}
                onChange={(v) => updateSetting('localMovement', v)} />
            <Toggle label="Отладка (F3)"
                value={!!settings.showDebug}
                onChange={(v) => updateSetting('showDebug', v)} />
        </div>

        {gameInfo && (
            <div
                className="mt-2 text-center text-xs text-gray-300"
                style={{ fontFamily: '"Minecraft", "Press Start 2P", monospace' }}
            >
                {gameInfo}
            </div>
        )}

        <div className="flex justify-center mt-4">
            <MCButton onClick={onBack} width={200}>Готово</MCButton>
        </div>
    </div>
);

const ControlsView = ({ onBack }) => {
    const groups = [
        {
            title: 'Движение',
            items: [
                ['W A S D', 'Перемещение'],
                ['Пробел', 'Прыжок'],
                ['Shift', 'Красться'],
                ['Ctrl', 'Бежать'],
            ]
        },
        {
            title: 'Инвентарь',
            items: [
                ['E / И', 'Открыть инвентарь'],
                ['1 — 9', 'Слот хотбара'],
                ['Колесо', 'Цикл хотбара'],
                ['Q', 'Выкинуть один'],
                ['Ctrl + Q', 'Выкинуть весь стак'],
                ['F', 'Поменять руки'],
                ['Shift + клик', 'Быстрый перенос'],
            ]
        },
        {
            title: 'Действия',
            items: [
                ['ЛКМ', 'Атака / копать'],
                ['ПКМ', 'Использ. / поставить'],
                ['T или /', 'Открыть чат'],
                ['Tab', 'Список игроков'],
            ]
        },
        {
            title: 'Прочее',
            items: [
                ['Esc', 'Меню паузы'],
                ['F1', 'Скрыть HUD'],
                ['F3', 'Отладка'],
                ['F5', 'Перспектива'],
            ]
        },
    ];

    return (
        <div className="flex flex-col gap-2" style={{ width: 480 }}>
            <h2 className="text-center text-white text-xl mb-3"
                style={{
                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                    textShadow: '2px 2px 0 #3f3f3f'
                }}>
                Управление
            </h2>
            <div className="grid grid-cols-2 gap-3">
                {groups.map(g => (
                    <div key={g.title}
                        style={{
                            background: 'rgba(0,0,0,0.4)',
                            padding: '8px 10px',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                        <div style={{
                            color: '#ffd966',
                            fontFamily: '"Minecraft", "Press Start 2P", monospace',
                            fontSize: 12, marginBottom: 6,
                            textShadow: '1px 1px 0 #3f3f3f'
                        }}>
                            {g.title}
                        </div>
                        {g.items.map(([key, desc]) => (
                            <div key={key} className="flex justify-between text-xs"
                                style={{
                                    color: '#fff',
                                    fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                    textShadow: '1px 1px 0 #000',
                                    marginBottom: 3,
                                }}>
                                <span style={{ color: '#a0ffa0' }}>{key}</span>
                                <span style={{ opacity: 0.85 }}>{desc}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex justify-center mt-3">
                <MCButton onClick={onBack} width={200}>Готово</MCButton>
            </div>
        </div>
    );
};

const MinecraftPauseMenu = ({
    visible,
    onClose,
    onDisconnect,
    settings,
    updateSetting,
    scoreboardVisible,
    setScoreboardVisible,
    gameInfo
}) => {
    const [view, setView] = useState('main');

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(2px)',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && view === 'main') onClose();
            }}
        >
            <div
                className="flex flex-col items-center gap-2"
                style={{
                    padding: 24,
                    background: 'rgba(0, 0, 0, 0.65)',
                    border: '2px solid rgba(255,255,255,0.08)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {view === 'main' && (
                    <>
                        <h1
                            className="text-white text-2xl mb-4"
                            style={{
                                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                textShadow: '3px 3px 0 #3f3f3f'
                            }}
                        >
                            Меню игры
                        </h1>

                        <MCButton onClick={onClose}>Вернуться в игру</MCButton>
                        <MCButton onClick={() => setView('settings')}>Настройки...</MCButton>
                        <MCButton onClick={() => setView('controls')}>Управление...</MCButton>
                        <div style={{ height: 8 }} />
                        <MCButton onClick={onDisconnect} danger>Отключиться</MCButton>
                    </>
                )}

                {view === 'settings' && (
                    <SettingsView
                        settings={settings}
                        updateSetting={updateSetting}
                        onBack={() => setView('main')}
                        scoreboardVisible={scoreboardVisible}
                        setScoreboardVisible={setScoreboardVisible}
                        gameInfo={gameInfo}
                    />
                )}

                {view === 'controls' && (
                    <ControlsView onBack={() => setView('main')} />
                )}
            </div>
        </div>
    );
};

export default MinecraftPauseMenu;
