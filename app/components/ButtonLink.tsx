'use client';
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

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
