import { Section, Container, Heading, Flex } from '@radix-ui/themes';
import { ButtonLink } from './ButtonLink';

export const PageLayout = ({
  children,
  heading,
  actions,
}: {
  children?: React.ReactNode;
  heading?: string;
  actions?: { label: string; href: string }[];
}) => {
  return (
    <main>
      <Section>
        <Container>
          <Flex justify="between" gap="2">
            <Heading as="h1" mb="6">
              {heading}
            </Heading>
            <Flex gap="2">
              {actions &&
                actions.map((action) => (
                  <ButtonLink key={action.label} href={action.href}>
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
