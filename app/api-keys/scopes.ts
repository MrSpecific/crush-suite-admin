export const apiKeyScopes = [
  { value: 'read:products', label: 'Read Products' },
  { value: 'write:products', label: 'Write Products' },
];

export const apiKeyScopeLabel = (scope: string) =>
  apiKeyScopes.find(({ value }) => value === scope)?.label ?? scope;
