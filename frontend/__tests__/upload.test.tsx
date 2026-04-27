import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import UploadPage from '../app/meetings/upload/page';
import { useRouter } from 'next/navigation';

jest.mock('axios');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('UploadPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('sends correct FormData on upload and redirects', async () => {
    const mockPost = axios.post as jest.Mock;
    mockPost.mockResolvedValueOnce({ data: { id: 'meeting-123' } });

    render(<UploadPage />);

    // Mock file drop/select
    const file = new File(['dummy content'], 'test-audio.mp3', { type: 'audio/mp3' });
    const input = screen.getByTestId('file-upload-input');
    
    await userEvent.upload(input, file);

    // Enter title
    const titleInput = screen.getByLabelText(/Meeting Title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Sprint Planning');

    // Click upload
    const uploadButton = screen.getByRole('button', { name: /Upload & Process/i });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/meetings/upload', expect.any(FormData), expect.any(Object));
      
      const formData = mockPost.mock.calls[0][1] as FormData;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('title')).toBe('Sprint Planning');
      
      expect(screen.getByText('Processing started')).toBeInTheDocument();
    });
    
    // Check redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/meetings/meeting-123');
    }, { timeout: 2000 });
  });
});
