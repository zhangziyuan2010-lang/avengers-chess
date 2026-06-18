import { useState, useCallback } from 'react';

const USERS_KEY = 'paw_users';
const CURRENT_USER_KEY = 'paw_current_user';
const STATS_PREFIX = 'paw_stats_';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem(CURRENT_USER_KEY) || null;
  });

  const getUsers = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch {
      return {};
    }
  }, []);

  const register = useCallback((username, password) => {
    const users = getUsers();
    if (users[username]) {
      return { success: false, error: '用户名已存在' };
    }
    if (!username.trim() || !password.trim()) {
      return { success: false, error: '用户名和密码不能为空' };
    }
    if (username.length < 2) {
      return { success: false, error: '用户名至少2个字符' };
    }
    if (password.length < 2) {
      return { success: false, error: '密码至少2个字符' };
    }
    users[username] = password;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    // Initialize stats
    localStorage.setItem(STATS_PREFIX + username, JSON.stringify({ games: 0, wins: 0 }));
    return { success: true };
  }, [getUsers]);

  const login = useCallback((username, password) => {
    const users = getUsers();
    if (!users[username]) {
      return { success: false, error: '用户不存在' };
    }
    if (users[username] !== password) {
      return { success: false, error: '密码错误' };
    }
    localStorage.setItem(CURRENT_USER_KEY, username);
    setCurrentUser(username);
    return { success: true };
  }, [getUsers]);

  const logout = useCallback(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
  }, []);

  const getStats = useCallback((username) => {
    try {
      return JSON.parse(localStorage.getItem(STATS_PREFIX + username)) || { games: 0, wins: 0 };
    } catch {
      return { games: 0, wins: 0 };
    }
  }, []);

  const recordGame = useCallback((username, won) => {
    const stats = getStats(username);
    stats.games += 1;
    if (won) stats.wins += 1;
    localStorage.setItem(STATS_PREFIX + username, JSON.stringify(stats));
    return stats;
  }, [getStats]);

  return { currentUser, register, login, logout, getStats, recordGame };
}
