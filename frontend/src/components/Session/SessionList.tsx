import React from "react";
import { models } from "../../../wailsjs/go/models";

interface SessionListProps {
  sessions: models.Session[];
  currentSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onSessionCreate: () => void;
  onSessionDelete: (id: string) => void;
  onSessionCompaction: (id: string) => void;
  onSessionTitleSummary: (id: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  onSessionCompaction,
  onSessionTitleSummary,
}) => {
  const [openMenuSessionId, setOpenMenuSessionId] = React.useState<
    string | null
  >(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setOpenMenuSessionId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // 防御的プログラミング: sessionsが配列であることを確認
  if (!Array.isArray(sessions)) {
    console.error("SessionList: sessions is not an array", sessions);
    return (
      <div className="session-list">
        <div className="session-list-header">
          <h3>Sessions</h3>
          <button onClick={onSessionCreate} title="New Session (Ctrl+N)">
            +
          </button>
        </div>
        <div className="error-message">Invalid sessions data</div>
      </div>
    );
  }

  return (
    <div
      className="session-list"
      ref={listRef}
      onClick={() => setOpenMenuSessionId(null)}
    >
      <div className="session-list-header">
        <h3>Sessions</h3>
        <button onClick={onSessionCreate} title="New Session (Ctrl+N)">
          +
        </button>
      </div>
      <ul>
        {sessions.map((session) => {
          // session オブジェクトの安全性をチェック
          if (!session || typeof session !== "object" || !session.id) {
            console.error("Invalid session object:", session);
            return null;
          }

          return (
            <li
              key={session.id}
              className={
                "session-item " +
                (currentSessionId === session.id ? "active" : "")
              }
              onClick={() => onSessionSelect(session.id)}
            >
              <span className="session-title">
                {session.title || "Untitled Session"}
              </span>
              <div
                className="session-item-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="session-menu-btn"
                  title="Session actions"
                  aria-label="Session actions"
                  aria-haspopup="menu"
                  aria-expanded={openMenuSessionId === session.id}
                  onClick={() => {
                    setOpenMenuSessionId((prev) =>
                      prev === session.id ? null : session.id,
                    );
                  }}
                >
                  ⋮
                </button>

                {openMenuSessionId === session.id && (
                  <div className="session-menu" role="menu">
                    <button
                      className="session-menu-item"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        onSessionCompaction(session.id);
                      }}
                    >
                      compaction
                    </button>
                    <button
                      className="session-menu-item"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        onSessionTitleSummary(session.id);
                      }}
                    >
                      title summary
                    </button>
                    <button
                      className="session-menu-item danger"
                      onClick={() => {
                        setOpenMenuSessionId(null);
                        onSessionDelete(session.id);
                      }}
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
