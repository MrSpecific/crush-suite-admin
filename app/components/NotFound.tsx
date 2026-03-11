import { Section, Container } from '@radix-ui/themes';

export const NotFound = ({ message = 'Not Found' }) => {
  return (
    <main>
      <Section>
        <Container size="4">
          <h1>{message}</h1>
        </Container>
      </Section>
    </main>
  );
};

export default NotFound;
