import type { CompliancePartnerConnection } from '@prisma/client';
import { compliancePartnerConnectionMetaData } from '@/lib/metaData';
import { Badge } from '@radix-ui/themes';

export const CompliancePartnerConnectionBadge = ({
  connection,
}: {
  connection?: CompliancePartnerConnection | null;
}) => {
  if (!connection) return null;

  const meta = compliancePartnerConnectionMetaData[connection];

  if (!meta) return null;

  return (
    <Badge color={meta.color} size="2" variant="soft">
      {meta.label}
    </Badge>
  );
};
