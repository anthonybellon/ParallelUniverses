import { render, screen } from '@testing-library/react';
import MainLayout from '@components/templates/MainLayout';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({ title: 'Parallel Universe Maker' })[key],
}));

describe('MainLayout', () => {
  it('shows the title, hint, chart and sidebar', () => {
    render(
      <MainLayout
        actions={<button type="button">Export</button>}
        hint="Select an event."
        chart={<div>Chart here</div>}
        sidebar={<div>Sidebar here</div>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Parallel Universe Maker' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Select an event.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Chart' })).toHaveTextContent(
      'Chart here',
    );
    expect(screen.getByRole('complementary')).toHaveTextContent('Sidebar here');
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
