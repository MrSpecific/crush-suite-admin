'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, type ButtonProps, IconButton, type IconButtonProps } from '@radix-ui/themes';

export const ButtonLink = ({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & ButtonProps) => {
  return (
    <Button {...props} asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
};

export const ButtonLinkSpinner = ({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & ButtonProps) => {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setLoading(false);
  }

  return (
    <Button {...props} asChild={!loading} onClick={() => setLoading(true)} loading={loading}>
      <Link href={href}>{children}</Link>
    </Button>
  );
};

export const IconButtonLink = ({
  href,
  children,
  ...props
}: { href: string; children: React.ReactNode } & IconButtonProps) => {
  return (
    <IconButton {...props} asChild>
      <Link href={href}>{children}</Link>
    </IconButton>
  );
};
