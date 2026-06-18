/**
 * Roll a single D6 (1-6).
 */
export function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Resolve one round of combat dice with bonuses.
 * attackerBonus/defenderBonus: added to dice roll (e.g. +1 from skill or terrain).
 */
export function resolveDiceRound(attackerBonus = 0, defenderBonus = 0) {
  const attackerRoll = rollD6() + attackerBonus;
  const defenderRoll = rollD6() + defenderBonus;

  if (attackerRoll > defenderRoll) {
    return { attackerRoll, defenderRoll, attackerBase: attackerRoll - attackerBonus, defenderBase: defenderRoll - defenderBonus, result: 'hit' };
  } else if (attackerRoll < defenderRoll) {
    return { attackerRoll, defenderRoll, attackerBase: attackerRoll - attackerBonus, defenderBase: defenderRoll - defenderBonus, result: 'miss' };
  } else {
    return { attackerRoll, defenderRoll, attackerBase: attackerRoll - attackerBonus, defenderBase: defenderRoll - defenderBonus, result: 'reroll' };
  }
}

/**
 * Resolve combat fully (keeps rolling on ties).
 */
export function resolveCombat(attackerBonus = 0, defenderBonus = 0) {
  const rounds = [];
  let round;
  do {
    round = resolveDiceRound(attackerBonus, defenderBonus);
    rounds.push(round);
  } while (round.result === 'reroll');
  return rounds;
}
