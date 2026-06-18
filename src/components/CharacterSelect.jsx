import { useState } from 'react';
import { CHARACTERS } from '../data/characters';

export default function CharacterSelect({ onConfirm }) {
  const [selected, setSelected] = useState([]);

  const toggleCharacter = (charId) => {
    setSelected((prev) => {
      if (prev.includes(charId)) {
        return prev.filter((id) => id !== charId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, charId];
    });
  };

  const handleStart = () => {
    if (selected.length !== 3) return;
    // AI gets the remaining 3
    const aiChars = CHARACTERS.filter((c) => !selected.includes(c.id)).map((c) => c.id);
    onConfirm(selected, aiChars);
  };

  return (
    <div className="select-page">
      <h1>选择你的战队</h1>
      <p className="select-subtitle">选择 3 位英雄出战（已选 {selected.length}/3）</p>

      <div className="character-grid">
        {CHARACTERS.map((char) => {
          const isSelected = selected.includes(char.id);
          return (
            <div
              key={char.id}
              className={`character-card ${isSelected ? 'selected' : ''}`}
              style={{ '--char-color': char.color }}
              onClick={() => toggleCharacter(char.id)}
            >
              <div className="char-emoji">{char.emoji}</div>
              <div className="char-name">{char.name}</div>
              <div className="char-en-name">{char.enName}</div>
              <div className="char-stats">
                <span className="stat" title="移动力">🦶 {char.move}</span>
                <span className="stat" title="攻击力">⚔️ {char.attack}</span>
                <span className="stat" title="血量">❤️ {char.hp}</span>
                <span className="stat" title="攻击射程">🎯 {char.range}</span>
              </div>
              <div className="char-desc">
                {char.skillName && (
                  <span className="char-skill-tag">⭐ {char.skillName}</span>
                )}
              </div>
              <div className="char-skill-full">
                {char.skillFull || char.skillShort}
              </div>
              {isSelected && <div className="selected-badge">✓</div>}
            </div>
          );
        })}
      </div>

      <button
        className="btn-primary btn-large"
        disabled={selected.length !== 3}
        onClick={handleStart}
      >
        ⚔️ 开始对战
      </button>
    </div>
  );
}
