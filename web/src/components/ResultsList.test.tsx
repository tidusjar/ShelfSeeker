import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsList from './ResultsList';
import type { SearchResult } from '../types';

describe('ResultsList', () => {
  const mockResults: SearchResult[] = [
    {
      botName: 'Bsk',
      bookNumber: 1,
      title: 'Harry Potter',
      author: 'JK Rowling',
      fileType: 'epub',
      size: '2.5MB',
      command: '!Bsk JK Rowling - Harry Potter.epub',
      filename: 'JK Rowling - Harry Potter.epub'
    },
    {
      botName: 'SearchBot',
      bookNumber: 2,
      title: 'The Shining',
      author: 'Stephen King',
      fileType: 'pdf',
      size: '1.8MB',
      command: '!SearchBot Stephen King - The Shining.pdf',
      filename: 'Stephen King - The Shining.pdf'
    },
    {
      botName: 'Ebook',
      bookNumber: 3,
      title: 'Unknown Book',
      author: '',
      fileType: 'mobi',
      size: '500KB',
      command: '!Ebook Unknown Book.mobi',
      filename: 'Unknown Book.mobi'
    }
  ];

  it('should render the correct number of results', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    const resultCards = screen.getAllByRole('button', { name: /download/i });
    expect(resultCards).toHaveLength(3);
  });

  it('should display result count and query', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="harry potter" />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Results Found')).toBeInTheDocument();
    expect(screen.getByText('"harry potter"')).toBeInTheDocument();
  });

  it('should display book title correctly', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('Harry Potter')).toBeInTheDocument();
    expect(screen.getByText('The Shining')).toBeInTheDocument();
    expect(screen.getByText('Unknown Book')).toBeInTheDocument();
  });

  it('should display author when available', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('by JK Rowling')).toBeInTheDocument();
    expect(screen.getByText('by Stephen King')).toBeInTheDocument();
  });

  it('should not display author when not available', () => {
    const mockDownload = vi.fn();
    const { container } = render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    // Check that we don't have an author paragraph for the third book
    const authorElements = container.querySelectorAll('.result-author');
    expect(authorElements).toHaveLength(2); // Only 2 books have authors
  });

  it('should display file type in uppercase', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('EPUB')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('MOBI')).toBeInTheDocument();
  });

  it('should display file size correctly', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('2.5MB')).toBeInTheDocument();
    expect(screen.getByText('1.8MB')).toBeInTheDocument();
    expect(screen.getByText('500KB')).toBeInTheDocument();
  });

  it('should display bot name correctly', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('Bsk')).toBeInTheDocument();
    expect(screen.getByText('SearchBot')).toBeInTheDocument();
    expect(screen.getByText('Ebook')).toBeInTheDocument();
  });

  it('should call onDownload when download button is clicked', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    
    fireEvent.click(downloadButtons[0]);
    expect(mockDownload).toHaveBeenCalledWith(mockResults[0]);
    
    fireEvent.click(downloadButtons[1]);
    expect(mockDownload).toHaveBeenCalledWith(mockResults[1]);
    
    expect(mockDownload).toHaveBeenCalledTimes(2);
  });

  it('should display numbered results starting from 001', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={mockResults} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('001')).toBeInTheDocument();
    expect(screen.getByText('002')).toBeInTheDocument();
    expect(screen.getByText('003')).toBeInTheDocument();
  });

  it('should render empty list when no results', () => {
    const mockDownload = vi.fn();
    render(<ResultsList results={[]} onDownload={mockDownload} searchQuery="test" />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Results Found')).toBeInTheDocument();
    
    const downloadButtons = screen.queryAllByRole('button', { name: /download/i });
    expect(downloadButtons).toHaveLength(0);
  });
});
