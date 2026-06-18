export default function GameOverPage({ winner, username, stats, onBackToLobby, onPlayAgain }) {
  const isWin = winner === 'player';

  return (
    <div className="gameover-page">
      <div className="gameover-card">
        <div className="gameover-emoji">{isWin ? '🎉' : '😞'}</div>
        <h1>{isWin ? '恭喜胜利！' : '很遗憾，AI 获胜'}</h1>

        <div className="gameover-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.games}</span>
            <span className="stat-label">总场次</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{stats.wins}</span>
            <span className="stat-label">胜利</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">
              {stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0}%
            </span>
            <span className="stat-label">胜率</span>
          </div>
        </div>

        <div className="gameover-buttons">
          <button className="btn-primary" onClick={onPlayAgain}>
            🔄 再来一局
          </button>
          <button className="btn-secondary" onClick={onBackToLobby}>
            🏠 返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}
