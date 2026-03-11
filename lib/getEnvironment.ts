import type { RadixColor } from '@/types/radix-ui';

const envs: {
  [key in Environment]: {
    label: string;
    color: RadixColor;
  };
} = {
  local: {
    label: 'Local',
    color: 'jade',
  },
  development: {
    label: 'Development',
    color: 'blue',
  },
  staging: {
    label: 'Staging',
    color: 'yellow',
  },
  production: {
    label: 'Production',
    color: 'tomato',
  },
  unknown: {
    label: 'Unknown',
    color: 'gray',
  },
};

type Environment = 'local' | 'development' | 'staging' | 'production' | 'unknown';

export const getEnvironment = () => {
  const name: Environment = (process.env.NEXT_PUBLIC_ENV as Environment) || 'unknown';
  const url = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    name,
    url,
    label: envs[name].label,
    color: envs[name].color as RadixColor,
  };
};
