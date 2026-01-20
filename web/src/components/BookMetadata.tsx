import React, { useState } from 'react';
import { BookMetadata as BookMetadataType } from '../types';
import './BookMetadata.css';

interface BookMetadataProps {
  metadata: BookMetadataType;
}

export const BookMetadata: React.FC<BookMetadataProps> = ({ metadata }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const renderRating = () => {
    if (!metadata.averageRating) return null;

    const rating = metadata.averageRating;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="book-rating" data-testid="book-rating">
        <div className="stars">
          {[...Array(fullStars)].map((_, i) => (
            <span key={`full-${i}`} className="star star-full">★</span>
          ))}
          {hasHalfStar && <span className="star star-half">★</span>}
          {[...Array(emptyStars)].map((_, i) => (
            <span key={`empty-${i}`} className="star star-empty">☆</span>
          ))}
        </div>
        <span className="rating-text">
          {rating.toFixed(1)}
          {metadata.ratingsCount && (
            <span className="rating-count"> ({metadata.ratingsCount.toLocaleString()} ratings)</span>
          )}
        </span>
      </div>
    );
  };

  const renderPublishInfo = () => {
    const parts: string[] = [];
    
    if (metadata.publishDate) {
      parts.push(metadata.publishDate);
    }
    if (metadata.publisher) {
      parts.push(metadata.publisher);
    }
    if (metadata.pageCount) {
      parts.push(`${metadata.pageCount} pages`);
    }
    if (metadata.language && metadata.language !== 'en') {
      parts.push(metadata.language.toUpperCase());
    }

    if (parts.length === 0) return null;

    return (
      <div className="book-publish-info" data-testid="book-publisher">
        {parts.join(' • ')}
      </div>
    );
  };

  const renderDescription = () => {
    if (!metadata.description) return null;

    const maxLength = 200;
    const needsTruncation = metadata.description.length > maxLength;
    const displayText = isDescriptionExpanded || !needsTruncation
      ? metadata.description
      : metadata.description.slice(0, maxLength) + '...';

    return (
      <div className="book-description">
        <p>{displayText}</p>
        {needsTruncation && (
          <button
            className="description-toggle"
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          >
            {isDescriptionExpanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    );
  };

  const renderSubjects = () => {
    if (!metadata.subjects || metadata.subjects.length === 0) return null;

    // Limit to first 5 subjects to avoid clutter
    const displaySubjects = metadata.subjects.slice(0, 5);

    return (
      <div className="book-subjects" data-testid="book-subjects">
        {displaySubjects.map((subject, index) => (
          <span key={index} className="subject-tag">
            {subject}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="book-metadata" data-testid="book-metadata">
      {renderRating()}
      {renderPublishInfo()}
      {renderDescription()}
      {renderSubjects()}
    </div>
  );
};
