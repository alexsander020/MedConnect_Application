import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import StarRating from '../../components/StarRating';
import { mockReviews } from '../../data/mockData';
import { Star, TrendingUp } from 'lucide-react';

export default function Reviews() {
    const avgRating = (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1);
    const ratingDist = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: mockReviews.filter(r => r.rating === stars).length,
        percent: (mockReviews.filter(r => r.rating === stars).length / mockReviews.length) * 100,
    }));

    return (
        <div className="app-container">
            <Header title="Avaliações" />

            <div className="page">
                {/* Summary card */}
                <div className="card animate-scale-in" style={{
                    marginBottom: 'var(--space-6)',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: 'none',
                }}>
                    <div className="flex items-center gap-6">
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-4xl)', fontWeight: 800, color: '#92400e', lineHeight: 1 }}>
                                {avgRating}
                            </p>
                            <StarRating rating={Math.round(Number(avgRating))} size={14} />
                            <p className="text-xs mt-1" style={{ color: '#92400e' }}>{mockReviews.length} avaliações</p>
                        </div>
                        <div style={{ flex: 1 }}>
                            {ratingDist.map(({ stars, count, percent }) => (
                                <div key={stars} className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                                    <span className="text-xs font-semibold" style={{ width: '12px', color: '#92400e' }}>{stars}</span>
                                    <Star size={10} fill="#f59e0b" color="#f59e0b" />
                                    <div style={{
                                        flex: 1, height: '6px', background: 'rgba(146,64,14,0.15)',
                                        borderRadius: '3px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${percent}%`, height: '100%',
                                            background: '#f59e0b', borderRadius: '3px',
                                            transition: 'width 0.5s ease-out',
                                        }} />
                                    </div>
                                    <span className="text-xs" style={{ width: '16px', color: '#92400e' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reviews list */}
                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {mockReviews.map((review) => (
                        <div key={review.id} className="card animate-slide-up">
                            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '13px' }}>
                                    {review.user.initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 className="font-semibold text-sm">{review.user.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={review.rating} size={12} />
                                        <span className="text-xs text-gray">{review.date}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--gray-600)', lineHeight: 1.5 }}>
                                {review.comment}
                            </p>
                            <p className="text-xs text-gray mt-2">Pedido: {review.orderId}</p>
                        </div>
                    ))}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
