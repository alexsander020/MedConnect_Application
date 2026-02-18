import { Star } from 'lucide-react';

export default function StarRating({ rating, size = 16, interactive = false, onChange }) {
    return (
        <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
                    onClick={() => interactive && onChange?.(star)}
                    style={{ display: 'inline-flex' }}
                >
                    <Star size={size} fill={star <= rating ? '#fbbf24' : 'none'} />
                </span>
            ))}
        </div>
    );
}
