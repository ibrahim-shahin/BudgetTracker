import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import EmptyState from '@/components/EmptyState';

it('shows the title and description, and runs the action', async () => {
  const onAction = jest.fn();
  await render(
    <EmptyState icon="credit-card" title="No categories yet" description="Create one" actionLabel="Create Category" onAction={onAction} />,
  );

  expect(screen.getByText('No categories yet')).toBeTruthy();
  expect(screen.getByText('Create one')).toBeTruthy();
  await fireEvent.press(screen.getByText('Create Category'));
  expect(onAction).toHaveBeenCalledTimes(1);
});
