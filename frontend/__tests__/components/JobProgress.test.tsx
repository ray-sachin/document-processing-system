import { render, screen } from '@testing-library/react';
import { JobProgress } from '@/components/jobs/JobProgress';

describe('JobProgress', () => {
  it('renders queued state', () => {
    render(
      <JobProgress 
        status="queued" 
        progress={0} 
        stage={null}
      />
    );
    
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
  });

  it('renders processing state with progress', () => {
    render(
      <JobProgress 
        status="processing" 
        progress={50} 
        stage="parsing_completed"
      />
    );
    
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/parsing completed/i)).toBeInTheDocument();
  });

  it('renders completed state', () => {
    render(
      <JobProgress 
        status="completed" 
        progress={100} 
        stage="job_completed"
      />
    );
    
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
  });

  it('renders failed state with error message', () => {
    render(
      <JobProgress 
        status="failed" 
        progress={40} 
        stage="parsing_started"
        message="Failed to parse document"
      />
    );
    
    expect(screen.getAllByText(/failed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/failed to parse document/i)).toBeInTheDocument();
  });

  it('shows connection indicator when connected', () => {
    render(
      <JobProgress 
        status="processing" 
        progress={30} 
        stage="document_received"
        isConnected={true}
      />
    );
    
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });
});
