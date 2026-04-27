import { Section, Container, Heading, Flex, Text, Box } from '@radix-ui/themes';
import { ButtonLink } from './ButtonLink';
import type { RadixButtonVariant, RadixColor } from '@/types/radix-ui.d';

export const PageLayout = ({
  children,
  heading,
  subheading,
  actions,
}: {
  children?: React.ReactNode;
  heading?: string;
  subheading?: string;
  actions?: { label: string; href: string; variant?: RadixButtonVariant; color?: RadixColor }[];
}) => {
  return (
    <main>
      <Section>
        <Container>
          <Flex justify="between" gap="2">
            <Box mb="6">
              <Heading as="h1">{heading}</Heading>
              {subheading && (
                <Text size="3" color="tomato" mt="-9" mb="4">
                  {subheading}
                </Text>
              )}
            </Box>
            <Flex gap="2">
              {actions &&
                actions.map((action) => (
                  <ButtonLink
                    key={action.label}
                    href={action.href}
                    variant={action.variant}
                    color={action.color}
                  >
                    {action.label}
                  </ButtonLink>
                ))}
            </Flex>
          </Flex>
          {children}
        </Container>
      </Section>
    </main>
  );
};
