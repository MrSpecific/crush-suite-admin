import Image from 'next/image';
import { Section, Container, Heading, Box } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';

export default async function Page() {
  return <PageLayout heading="Orders Report"></PageLayout>;
}
