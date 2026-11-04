import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState, ErrorState, Segmented, SourceBadge, Switch } from './index';

describe('UI primitives', () => {
  it('ErrorState shows the message and retries', async () => {
    const retry = vi.fn();
    render(<ErrorState error={new Error('Server exploded')} onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Server exploded');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalled();
  });
  it('ErrorState recognises offline errors', () => {
    render(<ErrorState error={new Error('You are offline.')} />);
    expect(screen.getByText('Connection problem')).toBeInTheDocument();
  });
  it('SourceBadge distinguishes live, cached and local data', () => {
    const { rerender } = render(<SourceBadge label="Nominatim" />);
    expect(screen.getByText(/Live/)).toBeInTheDocument();
    rerender(<SourceBadge fromCache cachedAt={new Date().toISOString()} />);
    expect(screen.getByText(/Cached/)).toBeInTheDocument();
    rerender(<SourceBadge local />);
    expect(screen.getByText(/Local dataset/)).toBeInTheDocument();
  });
  it('Switch and Segmented are accessible controls', async () => {
    const onSw = vi.fn();
    const onSeg = vi.fn();
    render(
      <>
        <Switch label="Dim map" checked={false} onChange={onSw} />
        <Segmented label="Units" value="a" onChange={onSeg} options={[{ value: 'a', label: 'Km' }, { value: 'b', label: 'Mi' }]} />
      </>,
    );
    await userEvent.click(screen.getByRole('switch', { name: 'Dim map' }));
    expect(onSw).toHaveBeenCalledWith(true);
    expect(screen.getByRole('radio', { name: 'Km' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Mi' }));
    expect(onSeg).toHaveBeenCalledWith('b');
  });
  it('EmptyState renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Try again later" />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });
});
