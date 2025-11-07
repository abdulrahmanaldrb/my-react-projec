// components/ReviewsPanel.tsx
import * as React from 'react';
import { Review, MarketplaceProject } from '../types';
import { addReview, getReviewsForProject, deleteReview, addReviewReply, reportReview } from '../services/firebaseService';
import { StarIcon, LoadingSpinner, TrashIcon, FlagIcon, ChatBubbleLeftEllipsisIcon } from './icons';
import { auth } from '../firebaseConfig';

interface ReviewsPanelProps {
    project: MarketplaceProject;
    showToast: (message: string) => void;
}

const StarRatingDisplay: React.FC<{ rating: number, count?: number, size?: string }> = ({ rating, count, size = "w-5 h-5" }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0; // Simplified: just check if not integer
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
        <div className="flex items-center gap-1">
            {[...Array(fullStars)].map((_, i) => (
                <StarIcon key={`full-${i}`} className={`${size} text-yellow-400`} fill="currentColor" />
            ))}
            {/* Simple half star representation */}
            {halfStar && <StarIcon className={`${size} text-yellow-400`} fill="currentColor" />} 
            {[...Array(emptyStars)].map((_, i) => (
                 <StarIcon key={`empty-${i}`} className={`${size} text-gray-400 dark:text-gray-600`} />
            ))}
            {count !== undefined && <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({count} reviews)</span>}
        </div>
    )
};


const StarRatingInput: React.FC<{ rating: number; setRating: (r: number) => void }> = ({ rating, setRating }) => (
    <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                <StarIcon 
                    className={`w-7 h-7 cursor-pointer transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-500 dark:text-gray-600 hover:text-yellow-400'}`}
                    fill={rating >= star ? 'currentColor' : 'none'}
                />
            </button>
        ))}
    </div>
);

const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ project, showToast }) => {
    const [reviews, setReviews] = React.useState<Review[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [userReview, setUserReview] = React.useState<Review | null>(null);
    const [error, setError] = React.useState<string|null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Form state
    const [newRating, setNewRating] = React.useState(0);
    const [newComment, setNewComment] = React.useState('');
    
    // Reply state
    const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
    const [replyText, setReplyText] = React.useState('');

    const currentUserId = auth.currentUser?.uid;
    const isCreator = project.creatorId === currentUserId;

    const fetchReviews = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedReviews = await getReviewsForProject(project.id);
            setReviews(fetchedReviews);
            if (currentUserId) {
                setUserReview(fetchedReviews.find(r => r.userId === currentUserId) || null);
            }
        } catch (e) {
            console.error("Failed to fetch reviews", e);
            setError("Could not load reviews.");
        } finally {
            setIsLoading(false);
        }
    }, [project.id, currentUserId]);

    React.useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);
    
    const anonymizeEmail = (email: string) => {
        if (!email) return 'anonymous';
        const [user, domain] = email.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newRating === 0 || !newComment.trim()) {
            setError("Please provide a rating and a comment.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await addReview(project.id, newRating, newComment);
            setNewRating(0);
            setNewComment('');
            showToast("Review submitted successfully!");
            fetchReviews();
        } catch (err: any) {
            setError(err.message || "There was an error submitting your review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReviewDelete = async (reviewId: string) => {
        if (!window.confirm("Are you sure you want to delete your review?")) return;
        setIsSubmitting(true); // Reuse submitting state for loading indicator
        setError(null);
        try {
            await deleteReview(project.id, reviewId);
            showToast("Review deleted.");
            fetchReviews();
        } catch (err: any) {
            setError(err.message || "Could not delete review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplySubmit = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);
        try {
            await addReviewReply(project.id, reviewId, replyText);
            setReplyingTo(null);
            setReplyText('');
            showToast("Reply posted.");
            fetchReviews();
        } catch (error) {
            showToast("Failed to post reply.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleReport = async (review: Review) => {
        if (!window.confirm("Are you sure you want to report this review as inappropriate?")) return;
        try {
            await reportReview(project, review);
            showToast("Review reported. Our moderators will review it shortly.");
            fetchReviews(); // Refresh to show reported state
        } catch (err: any) {
             showToast(err.message || "Failed to report review.");
        }
    };

    return (
        <div className="h-full w-full bg-gray-50 dark:bg-gray-900 flex flex-col p-8 overflow-y-auto">
            {/* Project Info Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                <h2 className="text-3xl font-bold mb-2">{project.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                    <StarRatingDisplay 
                        rating={project.averageRating || 0} 
                        count={project.reviewCount || 0}
                        size="w-6 h-6"
                    />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{project.shareData?.description || "No description provided."}</p>
            </div>
            
            {!isCreator && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
                    {userReview ? (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Your Review</h3>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">{[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-5 h-5 ${i < userReview.rating ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-600'}`} fill="currentColor" />)}</div>
                                <button onClick={() => handleReviewDelete(userReview.id)} disabled={isSubmitting} className="flex items-center gap-1 text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50">
                                    {isSubmitting ? <LoadingSpinner className="w-4 h-4"/> : <TrashIcon className="w-4 h-4"/>}
                                    {isSubmitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 p-3 rounded-md">{userReview.comment}</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
                            <form onSubmit={handleReviewSubmit}>
                                {error && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>}
                                <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Rating</label><StarRatingInput rating={newRating} setRating={setNewRating} /></div>
                                <div className="mb-4"><label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Comment</label><textarea id="comment" rows={4} value={newComment} onChange={(e) => setNewComment(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none border border-gray-300 dark:border-gray-600" placeholder="Share your experience..."/></div>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">{isSubmitting && <LoadingSpinner className="w-4 h-4 mr-2" />}{isSubmitting ? 'Submitting...' : 'Submit Review'}</button>
                            </form>
                        </>
                    )}
                </div>
            )}

            <div>
                 <h3 className="text-lg font-semibold mb-4">What others are saying</h3>
                 {isLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div>
                 : reviews.length > 0 ? (
                     <div className="space-y-6">
                        {reviews.map(review => (
                            <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-2">{[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-600'}`} fill="currentColor" />)}</div>
                                     <p className="text-xs text-gray-500">by {anonymizeEmail(review.userEmail)} on {review.createdAt?.toDate().toLocaleDateString()}</p>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 mb-3">{review.comment}</p>
                                
                                {review.reply && (
                                    <div className="border-l-2 border-green-500 pl-3 ml-4 my-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-r-md">
                                        <p className="text-xs font-bold text-green-600 dark:text-green-400">Reply from creator</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{review.reply.text}</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-4 mt-2">
                                    {isCreator && !review.reply && (
                                        replyingTo === review.id ? (
                                            <div className="w-full">
                                                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply..." rows={2} className="w-full text-sm bg-gray-100 dark:bg-gray-700 rounded-md p-2 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-300 dark:border-gray-600" />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setReplyingTo(null)} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">Cancel</button>
                                                    <button onClick={() => handleReplySubmit(review.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Submit</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setReplyingTo(review.id)} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><ChatBubbleLeftEllipsisIcon className="w-4 h-4"/> Reply</button>
                                        )
                                    )}
                                    {!isCreator && review.userId !== currentUserId && (
                                        review.isReported ? 
                                        <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500"><FlagIcon className="w-4 h-4"/> Reported</span> :
                                        <button onClick={() => handleReport(review)} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><FlagIcon className="w-4 h-4"/> Report</button>
                                    )}
                                </div>
                            </div>
                        ))}
                     </div>
                 ) : <div className="text-center text-gray-500 py-8">Be the first to leave a review!</div>}
            </div>
        </div>
    );
};

export default ReviewsPanel;