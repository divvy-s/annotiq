import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import SearchPage from '../app/search/page';
import { ResultGroup } from '../components/search/ResultGroup';

jest.mock('axios');

const mockChunks = [
  {
    id: 'chunk-1',
    meeting_id: 'meeting-1',
    meeting_title: 'Engineering Sync',
    meeting_date: '2023-10-15T10:00:00Z',
    speaker_name: 'Rahul',
    start_time: 272, // 4:32
    chunk_text: 'We need to optimize the database query latency.',
    final_score: 0.95
  }
];

describe('Search Interface', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, cacheTime: 0 } }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('debounces the search correctly (only 1 API call after 400ms)', async () => {
    const mockGet = axios.get as jest.Mock;
    mockGet.mockResolvedValue({ data: mockChunks });
    
    jest.useFakeTimers();

    renderWithClient(<SearchPage />);

    const input = screen.getByPlaceholderText(/Search transcripts/i);
    
    fireEvent.change(input, { target: { value: 'database' } });
    
    // Fast forward less than 400ms
    jest.advanceTimersByTime(200);
    expect(mockGet).not.toHaveBeenCalled();
    
    // Fast forward past 400ms
    jest.advanceTimersByTime(250);
    
    // After debounce, react query fetches
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2); // One for chunks, one for meetings
    });
    
    expect(mockGet).toHaveBeenCalledWith('/api/search?q=database');
    expect(mockGet).toHaveBeenCalledWith('/api/search/meetings?q=database');
  });

  it('renders empty state when API returns []', async () => {
    const mockGet = axios.get as jest.Mock;
    mockGet.mockResolvedValue({ data: [] });

    renderWithClient(<SearchPage />);
    
    const input = screen.getByPlaceholderText(/Search transcripts/i);
    fireEvent.change(input, { target: { value: 'unknown' } });
    
    // Let debounce finish
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  it('highlights keywords in excerpts', () => {
    render(
      <ResultGroup
        meetingId="m1"
        meetingTitle="Test Meeting"
        meetingDate="2023-10-15T10:00:00Z"
        results={mockChunks}
        searchQuery="database query"
        focusedResultId={null}
        onFocusResult={() => {}}
      />
    );
    
    const highlightedDatabase = screen.getByText('database');
    const highlightedQuery = screen.getByText('query');
    
    expect(highlightedDatabase.tagName).toBe('STRONG');
    expect(highlightedQuery.tagName).toBe('STRONG');
  });

  it('adds meeting_id param to request when filtered', async () => {
    const mockGet = axios.get as jest.Mock;
    mockGet.mockResolvedValue({ data: mockChunks });
    
    jest.useFakeTimers();

    renderWithClient(<SearchPage />);

    // Select filter
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '123' } });

    // Type query
    const input = screen.getByPlaceholderText(/Search transcripts/i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    jest.advanceTimersByTime(500);

    await waitFor(() => {
      // Should ONLY call chunks endpoint with meeting_id, should NOT call meetings endpoint
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/search?q=test&meeting_id=123');
  });
});
