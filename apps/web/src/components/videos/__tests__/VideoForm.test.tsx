import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoForm } from '../VideoForm';

describe('VideoForm', () => {
  it('submits the trimmed name and URL, then clears the fields', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<VideoForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('Video name'), '  Launch demo ');
    await user.type(screen.getByLabelText('Video URL'), 'https://example.com/demo.mp4');
    await user.click(screen.getByRole('button', { name: 'Submit video' }));

    await waitFor(() =>
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Launch demo',
        url: 'https://example.com/demo.mp4',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Video name')).toHaveValue(''));
  });

  it('rejects a URL that is not http or https without submitting', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();
    render(<VideoForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('Video name'), 'Launch demo');
    await user.type(screen.getByLabelText('Video URL'), 'ftp://example.com/demo.mp4');
    await user.click(screen.getByRole('button', { name: 'Submit video' }));

    expect(await screen.findByText('Enter a valid http or https URL')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('keeps the entered values when submission fails so the user can retry', async () => {
    const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    render(<VideoForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText('Video name'), 'Launch demo');
    await user.type(screen.getByLabelText('Video URL'), 'https://example.com/demo.mp4');
    await user.click(screen.getByRole('button', { name: 'Submit video' }));

    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
    expect(screen.getByLabelText('Video name')).toHaveValue('Launch demo');
  });
});
