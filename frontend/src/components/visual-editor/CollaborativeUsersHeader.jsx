import React from 'react';
import { useTranslation } from 'react-i18next';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const getModeIcon = (debugMode) => {
  switch (debugMode) {
    case 'live':
      return '🐛';
    case 'trace':
      return '📊';
    default:
      return '✏️';
  }
};

const getModeLabel = (debugMode, t) => {
  switch (debugMode) {
    case 'live':
      return t('debug.live');
    case 'trace':
      return t('debug.traceView');
    default:
      return t('collaboration.editing');
  }
};

const CollaborativeUsersHeader = () => {
  const { t } = useTranslation('visual-editor');
  const collabUsers = useVisualEditorStore(state => state.collabUsers);

  if (collabUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="hover:bg-blue-500/20"
          >
            <Users size={16} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#3b82f6' }}>
              {collabUsers.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-2">
          <div style={{ minWidth: '180px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#94a3b8' }}>
              {t('collaboration.online', { count: collabUsers.length })}
            </div>
            {collabUsers.map((user) => (
              <div
                key={user.socketId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 4px',
                  marginBottom: '2px',
                }}
              >
                {/* Color indicator */}
                <div
                  style={{
                    width: '10px',
                    height: '10px',
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
                    flex: 1,
                  }}
                >
                  {user.username}
                </span>

                {/* Mode icon */}
                <span
                  style={{
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                  title={getModeLabel(user.debugMode, t)}
                >
                  {getModeIcon(user.debugMode)}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CollaborativeUsersHeader;
