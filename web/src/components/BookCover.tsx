import { useState } from 'react';
import type { BookMetadata } from '../types';
import './BookCover.css';

interface BookCoverProps {
  metadata?: BookMetadata;
  title: string;
  size?: 'small' | 'medium' | 'large';
}

export default function BookCover({ metadata, title, size = 'medium' }: BookCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Select appropriate cover URL based on size
  const getCoverUrl = () => {
    if (!metadata) return null;

    switch (size) {
      case 'small':
        return metadata.coverUrlSmall || metadata.coverUrl;
      case 'large':
        return metadata.coverUrlLarge || metadata.coverUrl;
      case 'medium':
      default:
        return metadata.coverUrlMedium || metadata.coverUrl;
    }
  };

  const coverUrl = getCoverUrl();
  const showImage = coverUrl && !imageError;

  return (
    <div className={`book-cover book-cover-${size}`}>
      {showImage ? (
        <>
          {imageLoading && (
            <div className="book-cover-skeleton">
              <div className="skeleton-shimmer" />
            </div>
          )}
          <img
            src={coverUrl}
            alt={`Cover of ${title}`}
            className="book-cover-image"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        </>
      ) : (
        <div className="book-cover-placeholder">
          <svg
            className="book-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <div className="placeholder-text">{title.substring(0, 2).toUpperCase()}</div>
        </div>
      )}
    </div>
  );
}
