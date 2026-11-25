import { render, screen } from '@testing-library/react-native';
import React from 'react';

import AmountCell, { amountFontSize } from '@/components/AmountCell';

it('uses smaller type for longer amounts instead of cutting them off', () => {
  expect(amountFontSize('210.500')).toBe(16);
  expect(amountFontSize('12,345.50')).toBe(16);
  expect(amountFontSize('12,345.500')).toBe(15);
  expect(amountFontSize('123,456.500')).toBe(14);
  expect(amountFontSize('1,234,567.500')).toBe(13);
});

it('shows the currency, the amount without its sign, and a dash for none', async () => {
  await render(<AmountCell label="Left" minor={-3500} currency="JOD" testID="cell" />);
  expect(screen.getByText('JOD')).toBeTruthy();
  expect(screen.getByText('3.500')).toBeTruthy();
  await render(<AmountCell label="Budget" minor={null} currency="JOD" />);
  expect(screen.getByText('—')).toBeTruthy();
});
