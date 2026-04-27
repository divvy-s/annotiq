import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import MeetingDetailPage from '../app/meetings/[id]/page';

jest.mock('axios');
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'meeting-123' }),
}));

const mockMeetingPending = {
  id: 'meeting-123',
  title: 'Test Meeting',
  status: 'pending',
};

const mockMeetingProcessed = {
  id: 'meeting-123',
  title: 'Test Meeting',
  status: 'processed',
  short_summary: 'This is a summary',
  transcript_chunks: [
    { id: 'chunk-1', speaker_id: 'speaker-1', speaker_label: 'Speaker 1', text: 'Hello world', start_time: 0, end_time: 2 }
  ],
  action_items: [
    { id: 'action-1', description: 'Do the thing', status: 'open' }
  ]
};

describe('MeetingDetailPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } }
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('polls when status is pending and stops when processed', async () => {
    const mockGet = axios.get as jest.Mock;
    
    // Setup fetch sequence
    mockGet
      .mockResolvedValueOnce({ data: mockMeetingPending }) // 1st call
      .mockResolvedValueOnce({ data: mockMeetingProcessed }); // 2nd call

    // Force jest timers to manipulate time for testing useQuery refetchInterval
    jest.useFakeTimers();

    renderWithClient(<MeetingDetailPage />);

    // Initial render (pending state)
    await waitFor(() => {
      expect(screen.getByText('Waiting to process...')).toBeInTheDocument();
    });

    // Advance timers to trigger polling
    jest.advanceTimersByTime(5000);

    // After 2nd call, status is processed, UI should update
    await waitFor(() => {
      expect(screen.queryByText('Waiting to process...')).not.toBeInTheDocument();
      expect(screen.getByText('This is a summary')).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('updates speaker name optimistically', async () => {
    const mockGet = axios.get as jest.Mock;
    const mockPatch = axios.patch as jest.Mock;
    
    mockGet.mockResolvedValueOnce({ data: mockMeetingProcessed });
    mockGet.mockResolvedValueOnce({ data: { 
      ...mockMeetingProcessed, 
      transcript_chunks: [
        { ...mockMeetingProcessed.transcript_chunks[0], speaker_label: 'Jane Doe', display_name: 'Jane Doe' }
      ] 
    }});

    mockPatch.mockResolvedValue({ data: { success: true } });

    renderWithClient(<MeetingDetailPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Speaker 1')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText('Speaker 1'));
    
    // Type new name
    const input = screen.getByDisplayValue('Speaker 1');
    await userEvent.clear(input);
    await userEvent.type(input, 'Jane Doe');
    
    // Save
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    // Optimistic update should show immediately
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('Speaker 1')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/api/meetings/meeting-123/speakers/speaker-1', {
        display_name: 'Jane Doe'
      });
    });
  });

  it('updates action item checkbox optimistically', async () => {
    const mockGet = axios.get as jest.Mock;
    const mockPatch = axios.patch as jest.Mock;
    
    mockGet.mockResolvedValueOnce({ data: mockMeetingProcessed });
    mockGet.mockResolvedValueOnce({ data: { 
      ...mockMeetingProcessed, 
      action_items: [
        { ...mockMeetingProcessed.action_items[0], status: 'completed' }
      ] 
    }});

    mockPatch.mockResolvedValue({ data: { success: true } });

    renderWithClient(<MeetingDetailPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Do the thing')).toBeInTheDocument();
    });

    const actionItemContainer = screen.getByText('Do the thing').closest('div')?.parentElement;
    const button = actionItemContainer?.querySelector('button');
    
    if (button) {
      fireEvent.click(button);
    }

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/api/action-items/action-1', {
        status: 'completed'
      });
    });
  });
});
