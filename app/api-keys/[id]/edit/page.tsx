// import { Proposal as ProposalType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Separator } from '@radix-ui/themes';
import { NotFound } from '@/app/components/NotFound';
import { PageLayout } from '@/app/components/PageLayout';
import { APIKeyForm } from '../../APIKeyForm';
import { getMerchantOptions } from '../../server/getMerchantOptions';
import { DeleteRow } from '@/app/tools/DeleteRow';
import { serverSession } from '@/lib/authorize';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const session = await serverSession();
  const [data, merchantOptions] = await Promise.all([
    prisma.apiAccess.findUnique({ where: { id } }),
    getMerchantOptions(),
  ]);

  if (!id || !data) return <NotFound message="API Key Not Found" />;

  return (
    <PageLayout heading="Edit API Key">
      {/* <pre>{JSON.stringify(data, null, 2)}</pre> */}
      <APIKeyForm apiKey={data} merchantOptions={merchantOptions} />
      <Separator orientation="horizontal" size="4" my="5" />
      <DeleteRow type="apiKey" id={id} session={session} redirectTo="/api-keys" />
    </PageLayout>
  );
}
