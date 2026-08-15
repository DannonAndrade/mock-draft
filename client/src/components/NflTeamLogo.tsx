import { getNflTeamLogoSrc } from '../../../shared';

type Props = {
  teamName: string | null | undefined;
  className?: string;
};

export default function NflTeamLogo({ teamName, className = 'h-8 w-8' }: Props) {
  const src = teamName ? getNflTeamLogoSrc(teamName) : undefined;
  if (!src) return null;
  return (
    <img
      src={src}
      alt={teamName ? `${teamName} logo` : ''}
      className={`shrink-0 object-contain ${className}`}
      loading="lazy"
    />
  );
}
