import React, { useState } from 'react';
import { GitBranch, GitCommit, FileQuestion, ChevronDown, ChevronUp } from 'lucide-react';
import './CommitViewer.css';

export interface CommitData {
  hash: string;
  message: string | null | undefined;
  branch?: string | null;
}

interface CommitViewerProps {
  commit: CommitData;
}

export const CommitViewer: React.FC<CommitViewerProps> = ({ commit }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayMessage = commit.message?.trim() || "Nenhuma mensagem fornecida";
  const hasMessage = Boolean(commit.message?.trim());
  
  const isDetached = !commit.branch;
  const displayBranch = commit.branch || "Detached / Tag";

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="commit-viewer-container">
      <div className="commit-header">
        <GitCommit size={14} className="icon-commit" />
        <span className="commit-hash" title={commit.hash}>
          {commit.hash.substring(0, 7)}
        </span>
        <div className={`commit-branch-badge ${isDetached ? 'detached' : 'active'}`} title={`Branch: ${displayBranch}`}>
          {isDetached ? <FileQuestion size={12} /> : <GitBranch size={12} />}
          <span>{displayBranch}</span>
        </div>
      </div>
      
      <div className="commit-message-container">
        <p className={`commit-message ${!hasMessage ? 'empty-text' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
          {displayMessage}
        </p>
        {hasMessage && displayMessage.length > 70 && (
          <button 
            type="button" 
            className="commit-expand-btn" 
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <><ChevronUp size={12} /> Ocultar</>
            ) : (
              <><ChevronDown size={12} /> Ler mais</>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
