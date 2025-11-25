import React from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

const CollaborativeCursors = ({ flowToScreenPosition }) => {
  const collabCursors = useVisualEditorStore(state => state.collabCursors);

  // Подписываемся на viewport чтобы курсоры обновлялись при pan/zoom
  const viewport = useVisualEditorStore(state => state.viewport);

  return (
    <>
      {Array.from(collabCursors.entries()).map(([socketId, cursor]) => {
        // Преобразуем flow координаты в screen координаты
        const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });

        return (
          <div
            key={socketId}
            style={{
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              pointerEvents: 'none',
              zIndex: 1000,
              transform: 'translate(-4px, -4px)',
              transition: 'left 0.08s linear, top 0.08s linear',
            }}
          >
            {/* Курсор */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673L10.6819 17.3955L11.7712 17.3958L11.7717 19.5616L15.3788 13.286L13.213 13.286L13.2127 11.1203L5.65376 12.3673Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* Метка с именем */}
            <div
              style={{
                position: 'absolute',
                left: 20,
                top: 0,
                backgroundColor: cursor.color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {cursor.username}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default CollaborativeCursors;
