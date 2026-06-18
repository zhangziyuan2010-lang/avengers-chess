import { useState, useCallback, useReducer, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import LobbyPage from './components/LobbyPage';
import CharacterSelect from './components/CharacterSelect';
import GameBoard from './components/GameBoard';
import GameOverPage from './components/GameOverPage';
import { useAuth } from './hooks/useAuth';
import { useGame } from './hooks/useGame';
import './App.css';

export default function App() {
  const auth = useAuth();
  const game = useGame();
  const [page, setPage] = useState(auth.currentUser ? 'lobby' : 'login');
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const handleLogin = useCallback(
    (username, password) => {
      const result = auth.login(username, password);
      if (result.success) setPage('lobby');
      return result;
    },
    [auth]
  );

  const handleRegister = useCallback(
    (username, password) => auth.register(username, password),
    [auth]
  );

  const handleLogout = useCallback(() => {
    auth.logout();
    setPage('login');
  }, [auth]);

  const handleStartGame = useCallback(() => setPage('select'), []);

  const handleCharacterConfirm = useCallback(
    (playerChars, aiChars) => {
      game.dispatch({ type: '__INIT__', playerChars, aiChars });
      setPage('game');
    },
    [game]
  );

  // Detect game over
  useEffect(() => {
    if (page === 'game' && game.state?.gameOver) {
      auth.recordGame(auth.currentUser, game.state.winner === 'player');
      forceUpdate();
      setPage('gameover');
    }
  }, [page, game.state?.gameOver, game.state?.winner, auth, forceUpdate]);

  const handleBackToLobby = useCallback(() => {
    forceUpdate();
    setPage('lobby');
  }, [forceUpdate]);

  const handlePlayAgain = useCallback(() => setPage('select'), []);

  const stats = auth.getStats(auth.currentUser);

  return (
    <div className="app">
      {page === 'login' && (
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      )}

      {page === 'lobby' && (
        <LobbyPage
          username={auth.currentUser}
          stats={stats}
          onStartGame={handleStartGame}
          onLogout={handleLogout}
        />
      )}

      {page === 'select' && (
        <CharacterSelect onConfirm={handleCharacterConfirm} />
      )}

      {page === 'game' && game.state && (
        <GameBoard state={game.state} actions={game} />
      )}

      {page === 'gameover' && game.state && (
        <GameOverPage
          winner={game.state.winner}
          username={auth.currentUser}
          stats={stats}
          onBackToLobby={handleBackToLobby}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
