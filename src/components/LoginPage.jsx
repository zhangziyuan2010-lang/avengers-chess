import { useState } from 'react';

export default function LoginPage({ onLogin, onRegister }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    let result;
    if (isRegister) {
      result = onRegister(username, password);
      if (result.success) {
        // Auto-login after register
        const loginResult = onLogin(username, password);
        if (!loginResult.success) {
          setError(loginResult.error);
        }
        return;
      }
    } else {
      result = onLogin(username, password);
      if (result.success) return;
    }

    setError(result.error);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🐾</div>
        <h1>汪汪队大作战</h1>
        <p className="login-subtitle">Paw Patrol Battle</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary">
            {isRegister ? '注册并登录' : '登录'}
          </button>
        </form>

        <p className="login-toggle">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            className="link-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  );
}
