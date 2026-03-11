'use client';
import { useState } from 'react';
import { Button, ButtonProps } from '@radix-ui/themes';
import { ClipboardCopyIcon } from '@radix-ui/react-icons';

export function ClipboardCopy({
  text,
  size = '1',
}: { text?: string | null | undefined; size?: '1' | '2' | '3' | '4' } & Partial<
  Pick<ButtonProps, 'variant' | 'color'>
>) {
  const [isCopied, setIsCopied] = useState(false);
  if (!text) return null;

  // This is the function we wrote earlier
  async function copyTextToClipboard(copyText: string) {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(copyText);
    } else {
      return document.execCommand('copy', true, copyText);
    }
  }

  // onClick handler function for the copy button
  const handleCopyClick = () => {
    // Asynchronously call copyTextToClipboard
    copyTextToClipboard(text)
      .then(() => {
        // If successful, update the isCopied state value
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <Button size={size} variant="ghost" color="gray" onClick={handleCopyClick}>
      <ClipboardCopyIcon />
      {isCopied && 'Copied!'}
    </Button>
  );
}
