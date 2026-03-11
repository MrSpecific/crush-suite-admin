import { Section, Container, Heading } from '@radix-ui/themes';

export function NotAuthorized() {
  return (
    <main>
      <Section>
        <Container size="1">
          <Heading as="h1" style={{ textAlign: 'center' }}>
            Not Authorized to view this page
          </Heading>
        </Container>
      </Section>
    </main>
  );
}

export default NotAuthorized;
