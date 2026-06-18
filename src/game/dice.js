/**
 * Roll a single D6 (1-6).
 */
export function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Resolve one round of combat dice.
 * Returns { attackerRoll, defenderRoll, hit: boolean | 'reroll' }
 */
export function resolveDiceRound() {
  const attackerRoll = rollD6();
  const defenderRoll = rollD6();

  if (attackerRoll > defenderRoll) {
    return { attackerRoll, defenderRoll, result: 'hit' };
  } else if (attackerRoll < defenderRoll) {
    return { attackerRoll, defenderRoll, result: 'miss' };
  } else {
    return { attackerRoll, defenderRoll, result: 'reroll' };
  }
}

/**
 * Resolve combat fully (keeps rolling on ties).
 * Returns an array of rounds for animation purposes.
 */
export function resolveCombat() {
  const rounds = [];
  let round;
  do {
    round = resolveDiceRound();
    rounds.push(round);
  } while (round.result === 'reroll');
  return rounds;
}
