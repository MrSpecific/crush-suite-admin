import { Container, Box, Heading, Card } from '@radix-ui/themes';
import { DiscountForm } from '../DiscountForm';

export default async function Page() {
  return (
    <Container size="2" p="4">
      <Heading as="h1">Add Discount</Heading>
      <Box maxWidth="400px">
        <Card my="4">
          <DiscountForm />
        </Card>
      </Box>
    </Container>
  );
}
