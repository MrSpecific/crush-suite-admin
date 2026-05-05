import type { RadixColor } from '@/types/radix-ui';

export type Environment = 'local' | 'development' | 'staging' | 'production' | 'unknown';
export type App = 'compliance' | 'clubs' | 'seats';

type AppColorScheme = {
  label: string;
  color: RadixColor;
};

type EnvironmentConfig = {
  label: string;
  // Keep this as the compliance color for existing consumers.
  color: RadixColor;
  apps: Record<App, AppColorScheme>;
};

const envs: Record<Environment, EnvironmentConfig> = {
  local: {
    label: 'Local',
    color: 'jade',
    apps: {
      compliance: { label: 'Compliance', color: 'jade' },
      clubs: { label: 'Clubs', color: 'teal' },
      seats: { label: 'Seats', color: 'mint' },
    },
  },
  development: {
    label: 'Development',
    color: 'blue',
    apps: {
      compliance: { label: 'Compliance', color: 'blue' },
      clubs: { label: 'Clubs', color: 'cyan' },
      seats: { label: 'Seats', color: 'indigo' },
    },
  },
  staging: {
    label: 'Staging',
    color: 'yellow',
    apps: {
      compliance: { label: 'Compliance', color: 'yellow' },
      clubs: { label: 'Clubs', color: 'amber' },
      seats: { label: 'Seats', color: 'orange' },
    },
  },
  production: {
    label: 'Production',
    color: 'tomato',
    apps: {
      compliance: { label: 'Compliance', color: 'tomato' },
      clubs: { label: 'Clubs', color: 'ruby' },
      seats: { label: 'Seats', color: 'crimson' },
    },
  },
  unknown: {
    label: 'Unknown',
    color: 'gray',
    apps: {
      compliance: { label: 'Compliance', color: 'gray' },
      clubs: { label: 'Clubs', color: 'gray' },
      seats: { label: 'Seats', color: 'gray' },
    },
  },
};

const isEnvironment = (value?: string): value is Environment => {
  return !!value && Object.prototype.hasOwnProperty.call(envs, value);
};

export const getEnvironment = (app: App = 'compliance') => {
  const name: Environment = isEnvironment(process.env.NEXT_PUBLIC_ENV)
    ? process.env.NEXT_PUBLIC_ENV
    : 'unknown';
  const config = envs[name];
  const url = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  return {
    name,
    url,
    app,
    label: config.label,
    color: config.color,
    apps: config.apps,
    appColorScheme: config.apps[app],
  };
};
