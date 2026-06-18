import { CHARACTERS } from '../data/characters';

export default function RulesPage({ onContinue }) {
  return (
    <div className="rules-page">
      <div className="rules-card">
        <h1>📜 游戏规则</h1>

        <section className="rules-section">
          <h2>🎯 游戏目标</h2>
          <p>全灭对方 3 名英雄即可获胜。10×10 棋盘上，你与 AI 轮流行动，运筹帷幄、决胜千里。</p>
        </section>

        <section className="rules-section">
          <h2>🔄 回合流程</h2>
          <ol>
            <li>每回合可选择一名英雄：<strong>移动 → 攻击</strong>（或选择休息）</li>
            <li>一方所有英雄行动完毕后，轮到对方行动</li>
            <li>首回合先后手随机决定</li>
          </ol>
        </section>

        <section className="rules-section">
          <h2>👟 移动规则</h2>
          <ul>
            <li>上下左右四方向移动，每格消耗 1 点移动力</li>
            <li>不可穿越任何单位（<strong>钢铁侠、鹰眼</strong>除外）</li>
            <li>不可停留在已有单位的格子上</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2>⚔️ 攻击规则</h2>
          <ul>
            <li>移动到敌方周围即可发起攻击</li>
            <li>双方各掷 1 个 6 面骰子比大小</li>
            <li><strong>攻方 &gt; 守方</strong>：命中，扣攻击力血量</li>
            <li><strong>攻方 &lt; 守方</strong>：未命中</li>
            <li><strong>平局</strong>：重新掷骰，直到分出胜负</li>
            <li>鹰眼射程 2 格，其余英雄射程 1 格</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2>🌍 地形效果</h2>
          <ul>
            <li>⛰️ <strong>高地</strong>：攻击伤害 +1，防御骰子 +1</li>
            <li>🌊 <strong>河流</strong>：进入即停止移动，每回合 HP -1</li>
            <li>💧 <strong>泉水</strong>：每回合 HP +1（不超过最大值）</li>
            <li>每局地图随机生成 4~10 个地形</li>
          </ul>
        </section>

        <section className="rules-section">
          <h2>⭐ 英雄技能</h2>
          <div className="rules-skills-grid">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="rules-skill-item" style={{ '--char-color': c.color }}>
                <span className="rules-skill-emoji">{c.emoji}</span>
                <div className="rules-skill-info">
                  <strong>{c.name}</strong> · {c.skillName}
                  <p>{c.skillShort}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="rules-credit">
          💡 本小游戏创意源于卡司-汪汪队大作战
        </p>

        <button className="btn-primary btn-large" onClick={onContinue}>
          开始游戏 →
        </button>
      </div>
    </div>
  );
}
