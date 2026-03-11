import NextLink from 'next/link';
import { Link as RadixLink, type LinkProps } from '@radix-ui/themes';

export const Link = ({ children, href, ...props }: LinkProps) => {
  return (
    <RadixLink asChild {...props}>
      <NextLink href={href!}>{children}</NextLink>
    </RadixLink>
  );
};
