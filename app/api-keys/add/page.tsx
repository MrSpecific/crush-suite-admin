import { Container, Box, Heading, Card } from '@radix-ui/themes';
import { APIKeyForm } from '../APIKeyForm';

export default async function Page() {
  return (
    <Container size="2" p="4">
      <Heading as="h1">Add New API Key</Heading>
      <Box maxWidth="400px">
        <Card my="4">
          <APIKeyForm />
        </Card>
      </Box>
    </Container>
  );
}
