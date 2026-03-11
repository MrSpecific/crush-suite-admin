'use client';
import { Role } from '@prisma/client';
import { createUser } from '@/app/users/new/createUser';
import { Form, type FormFieldProps } from '@/app/components/forms/Form';

export const CreateUserForm = () => {
  const formFields: FormFieldProps[] = [
    { id: 'email', name: 'email', label: 'Email' },
    { id: 'givenName', name: 'givenName', label: 'First Name' },
    { id: 'familyName', name: 'familyName', label: 'Last Name' },
    {
      id: 'role',
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        {
          label: 'Role',
          options: Object.keys(Role).map((role) => ({ value: role, label: role })),
        },
      ],
    },
    { id: 'password', type: 'password', name: 'password', label: 'Password' },
  ];

  return (
    <Form
      action={createUser}
      fields={formFields}
      submitLabel="Create User"
      redirectTo={({ id }) => `/users/${id}`}
    />
  );
};
