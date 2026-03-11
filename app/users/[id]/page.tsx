// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Flex, Text } from '@radix-ui/themes';
import { Link } from '@/app/components/Link';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const user = await prisma.adminUser.findUnique({
    where: {
      id,
    },
  });

  if (!id || !user) return <NotFound message="User Not Found" />;

  const { givenName, familyName, email } = user;

  return (
    <PageLayout heading={`${givenName} ${familyName}`}>
      <Text color="gray">{email}</Text>

      <Flex align="start" justify="end" gap="2">
        <Link href={`/users/${id}/edit`}>Edit</Link>
      </Flex>
    </PageLayout>
  );
}
