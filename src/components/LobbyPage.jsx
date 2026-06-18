export default function LobbyPage({ username, stats, onStartGame, onLogout }) {
  return (
    <div className="lobby-page">
      <div className="lobby-card">
        <div className="lobby-logo">🐾</div>
        <h1>复仇者联盟战棋</h1>
        <p className="lobby-welcome">
          欢迎，<strong>{username}</strong>！
        </p>

        <div className="stats-box">
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

        <button className="btn-primary btn-large" onClick={onStartGame}>
          ⚔️ 开始对战
        </button>

        <button className="btn-secondary" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}
