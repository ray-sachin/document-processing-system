import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadZone } from '@/components/upload/UploadZone';

describe('UploadZone', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('renders upload zone with instructions', () => {
    render(<UploadZone onUpload={mockOnUpload} isUploading={false} />);
    
    expect(screen.getByText(/drag/i)).toBeInTheDocument();
    expect(screen.getByText(/browse your computer/i)).toBeInTheDocument();
  });

  it('disables the drop zone while uploading', () => {
    render(<UploadZone onUpload={mockOnUpload} isUploading={true} />);
    
    expect(screen.getByRole('presentation')).toHaveClass('pointer-events-none');
  });

  it('accepts files through input', async () => {
    render(<UploadZone onUpload={mockOnUpload} isUploading={false} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
    });

    fireEvent.change(input);

    fireEvent.click(await screen.findByRole('button', { name: /upload 1 file/i }));
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    });
  });

  it('respects maxFiles limit', async () => {
    render(<UploadZone onUpload={mockOnUpload} isUploading={false} maxFiles={2} />);
    
    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
      new File(['content3'], 'file3.txt', { type: 'text/plain' }),
    ];
    
    const input = screen.getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: files,
    });

    fireEvent.change(input);

    fireEvent.click(await screen.findByRole('button', { name: /upload 2 files/i }));
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(files.slice(0, 2));
    });
  });
});
