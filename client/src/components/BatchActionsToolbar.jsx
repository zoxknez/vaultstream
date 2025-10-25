import React from 'react';
import { CheckCheck, X } from 'lucide-react';
import useConfirmDialog from '../hooks/useConfirmDialog';
import './BatchActionsToolbar.css';

/**
 * Batch Actions Toolbar
 * 
 * Floating toolbar for batch episode actions:
 * - Mark all episodes as watched
 * - Mark season as watched
 * - Clear all progress
 */

const BatchActionsToolbar = ({ 
  activeSeason,
  onMarkAllAsWatched,
  onMarkSeasonAsWatched,
  onClearAllProgress,
  onClose
}) => {
  const [requestConfirm, confirmDialog] = useConfirmDialog();

  return (
    <>
      <div className="batch-actions-toolbar">
        <div className="batch-actions-content">
        <h3 className="batch-actions-title">
          Batch Actions
        </h3>

        <div className="batch-actions-buttons">
          {activeSeason !== null && (
            <button
              className="batch-action-btn"
              onClick={() => {
                onMarkSeasonAsWatched(activeSeason);
                onClose();
              }}
              title={`Mark Season ${activeSeason} as watched`}
            >
              <CheckCheck size={18} />
              <span>Mark Season {activeSeason} as Watched</span>
            </button>
          )}

          <button
            className="batch-action-btn"
            onClick={() => {
              onMarkAllAsWatched();
              onClose();
            }}
            title="Mark all episodes as watched"
          >
            <CheckCheck size={18} />
            <span>Mark All Episodes as Watched</span>
          </button>

          <button
            className="batch-action-btn danger"
            onClick={async () => {
              const confirmed = await requestConfirm({
                title: 'Clear progress',
                message: 'Clear all progress for this series? This action cannot be undone.',
                confirmLabel: 'Clear Progress',
                cancelLabel: 'Cancel',
                danger: true
              });

              if (!confirmed) {
                return;
              }

              onClearAllProgress();
              onClose();
            }}
            title="Clear all progress"
          >
            <X size={18} />
            <span>Clear All Progress</span>
          </button>
        </div>

        <button
          className="batch-actions-close"
          onClick={onClose}
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
      </div>
      {confirmDialog}
    </>
  );
};

export default BatchActionsToolbar;
