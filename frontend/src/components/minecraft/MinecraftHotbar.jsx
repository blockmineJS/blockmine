import React from 'react';

const MinecraftHotbar = ({ inventory, selectedSlot, onSlotSelect }) => {
    const hotbarSlots = Array.from({ length: 9 }, (_, index) => {
        let item = inventory?.find(item => item.slot === index + 36);
        if (!item) {
            item = inventory?.find(item => item.slot === index);
        }
        return item || null;
    });

    const getItemIconPath = (itemName) => {
        const animatedItems = ['clock', 'compass', 'recovery_compass'];
        if (animatedItems.includes(itemName)) {
            return `/minecraft-assets/items/${itemName}_00.png`;
        }
        return `/minecraft-assets/items/${itemName}.png`;
    };

    return (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1 z-10 select-none">
            {hotbarSlots.map((item, index) => {
                const isSelected = selectedSlot === index;

                return (
                    <div
                        key={index}
                        onClick={() => onSlotSelect?.(index)}
                        className={`
                            relative w-16 h-16
                            bg-gradient-to-b from-gray-700 to-gray-900
                            border-2
                            ${isSelected
                                ? 'border-white shadow-lg shadow-white/60 scale-110'
                                : 'border-gray-700'
                            }
                            transition-all duration-100
                            cursor-pointer
                            hover:border-gray-500
                            flex items-center justify-center
                        `}
                        style={{
                            imageRendering: 'pixelated',
                            boxShadow: isSelected
                                ? '0 0 15px rgba(255, 255, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.2), 0 4px 8px rgba(0, 0, 0, 0.5)'
                                : 'inset 0 -2px 4px rgba(0, 0, 0, 0.6), inset 0 2px 2px rgba(255, 255, 255, 0.1), 0 2px 4px rgba(0, 0, 0, 0.3)',
                            background: isSelected
                                ? 'linear-gradient(135deg, rgba(100, 100, 100, 0.9) 0%, rgba(60, 60, 60, 0.9) 100%)'
                                : 'linear-gradient(135deg, rgba(70, 70, 70, 0.85) 0%, rgba(30, 30, 30, 0.85) 100%)'
                        }}
                    >
                        {/* Номер слота */}
                        <div
                            className="absolute top-0.5 left-1.5 text-white text-xs font-bold opacity-50"
                            style={{
                                textShadow: '1px 1px 1px rgba(0, 0, 0, 0.8)'
                            }}
                        >
                            {index + 1}
                        </div>

                        {item && (
                            <div className="flex items-center justify-center w-full h-full relative">
                                {/* Иконка предмета */}
                                <img
                                    src={getItemIconPath(item.name)}
                                    alt={item.displayName || item.name}
                                    title={item.displayName || item.name}
                                    className="w-12 h-12 object-contain"
                                    style={{
                                        imageRendering: 'pixelated',
                                        filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5))'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fallback = e.target.nextSibling;
                                        if (fallback) fallback.style.display = 'block';
                                    }}
                                />
                                {/* Fallback - первая буква если иконка не найдена */}
                                <div
                                    className="text-2xl font-bold text-white"
                                    style={{
                                        display: 'none',
                                        textShadow: '2px 2px 0 #000'
                                    }}
                                >
                                    {item.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Количество */}
                                {item.count > 1 && (
                                    <div
                                        className="absolute bottom-0.5 right-1.5 text-white text-sm font-bold"
                                        style={{
                                            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 4px rgba(0, 0, 0, 0.8)'
                                        }}
                                    >
                                        {item.count}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Подсветка выбранного слота */}
                        {isSelected && (
                            <>
                                <div className="absolute inset-0 border-2 border-white opacity-40 pointer-events-none"></div>
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 70%)'
                                    }}
                                ></div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default MinecraftHotbar;
