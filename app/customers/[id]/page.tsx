// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Flex, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const data = await prisma.merchant.findUnique({
    where: {
      id: parseInt(id),
    },
  });

  if (!id || !data) return <NotFound message="Merchant Not Found" />;

  const { shop, compliancePartner } = data;

  return (
    <PageLayout heading={`${shop}`}>
      <Text color="gray">{compliancePartner}</Text>

      <Flex align="start" justify="end" gap="2">
        <Link href={`/merchants/${id}/edit`}>Edit</Link>
      </Flex>
    </PageLayout>
  );
}
