// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Separator } from '@radix-ui/themes';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { APIKeyForm } from '../../APIKeyForm';
import { DeleteRow } from '@/app/tools/DeleteRow';
import { serverSession } from '@/lib/authorize';

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;

  const session = await serverSession();
  const data = await prisma.apiAccess.findUnique({ where: { id } });

  if (!id || !data) return <NotFound message="API Key Not Found" />;

  return (
    <PageLayout heading={`Discount Id #${id}`}>
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
      <APIKeyForm apiKey={data} />
      <Separator orientation="horizontal" size="4" my="5" />
      <DeleteRow type="apiKey" id={id} session={session} redirectTo="/api-keys" />
    </PageLayout>
  );
}
