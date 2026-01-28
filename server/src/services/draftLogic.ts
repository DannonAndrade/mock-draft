import { TEAM_COUNT } from '../../../shared';

export function getTeamIndexForPick(pickNumber: number): number {
  // Linear draft
  // When we reach team 8, cycle back to team 0
  return (pickNumber - 1) % TEAM_COUNT;
}

export function getRoundForPick(pickNumber: number): number {
  return Math.ceil(pickNumber / TEAM_COUNT);
}