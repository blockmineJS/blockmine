import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

/**
 * CollaborativeConnections
 * Отображает линии соединений, которые рисуют другие пользователи
 */
const CollaborativeConnections = ({ flowToScreenPosition }) => {
  const collabConnections = useVisualEditorStore(state => state.collabConnections);

  // Подписываемся на viewport чтобы линии обновлялись при pan/zoom
  const viewport = useVisualEditorStore(state => state.viewport);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {Array.from(collabConnections.entries()).map(([socketId, connection]) => {
        const { fromX, fromY, toX, toY, color, username } = connection;


        const fromPos = flowToScreenPosition({ x: fromX, y: fromY });
        const toPos = flowToScreenPosition({ x: toX, y: toY });

        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const controlPointOffset = Math.abs(toPos.x - fromPos.x) * 0.3;

        const path = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + controlPointOffset} ${fromPos.y}, ${toPos.x - controlPointOffset} ${toPos.y}, ${toPos.x} ${toPos.y}`;

        return (
          <g key={socketId}>
            {/* Линия соединения */}
            <path
              d={path}
              stroke={color}
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,5"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.5))',
                transition: 'd 0.1s ease-out',
              }}
            />
            <circle
              cx={fromPos.x}
              cy={fromPos.y}
              r="6"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />

            <circle
              cx={toPos.x}
              cy={toPos.y}
              r="6"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />

            <text
              x={midX}
              y={midY - 10}
              fill={color}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))',
                userSelect: 'none',
              }}
            >
              {username}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default CollaborativeConnections;
