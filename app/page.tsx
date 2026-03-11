import Image from 'next/image';
import { Section, Container, Heading, Box } from '@radix-ui/themes';
import { prisma } from '@/lib/prisma';
import { PageLayout } from '@/app/components/PageLayout';

export default async function Home() {
  // const users = await prisma.merchant.findMany({
  //   select: {
  //     id: true,
  //     compliancePartner: true,
  //     shop: true,
  //   },
  // });

  return (
    <PageLayout heading="Welcome to Crush Suite Admin">
      {/* <Box>{JSON.stringify(users)}</Box> */}
    </PageLayout>
  );
}
