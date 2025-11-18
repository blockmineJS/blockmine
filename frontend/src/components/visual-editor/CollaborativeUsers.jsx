import React, { useState } from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

const CollaborativeUsers = () => {
  const collabUsers = useVisualEditorStore(state => state.collabUsers);
  const [isExpanded, setIsExpanded] = useState(true);

  if (collabUsers.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 999,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        minWidth: '200px',
        color: 'white',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} />
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            В сети ({collabUsers.length})
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Users List */}
      {isExpanded && (
        <div style={{ padding: '8px' }}>
          {collabUsers.map((user) => (
            <div
              key={user.socketId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '4px',
              }}
            >
              {/* Color indicator */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: user.color,
                  flexShrink: 0,
                }}
              />

              {/* Username */}
              <span
                style={{
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaborativeUsers;
