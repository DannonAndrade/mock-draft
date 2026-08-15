import { TEAM_COUNT } from '../../../shared';

export function getTeamIndexForPick(pickNumber: number): number {
  // Linear draft: after the last pick slot, cycle back to team 1
  return (pickNumber - 1) % TEAM_COUNT;
}

export function getRoundForPick(pickNumber: number): number {
  return Math.ceil(pickNumber / TEAM_COUNT);
}