import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Star } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
    isPending: boolean;
}

export const FeedbackModal = ({ isOpen, onClose, onSubmit, isPending }: FeedbackModalProps) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);

    const handleSubmit = () => {
        if (rating === 0) return;
        onSubmit(rating, comment);
        // Reset state after successful submission handled by parent
        setRating(0);
        setComment('');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="We value your feedback"
            size="md"
            footer={
                <div className="flex justify-end gap-2 w-full">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isPending ? 'Sending...' : 'Submit Feedback'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="text-center space-y-2">
                    <p className="text-slate-500">
                        How would you rate your recent experience with Giki Transport?
                    </p>
                    <div className="flex justify-center gap-2 py-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="focus:outline-none transition-transform active:scale-95"
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <Star
                                    className={`w-10 h-10 transition-colors ${(hoveredRating || rating) >= star
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-slate-300'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-sm font-medium text-slate-900 animate-in fade-in slide-in-from-bottom-2">
                            {rating === 5 && "Excellent! We're glad you liked it."}
                            {rating === 4 && "Good! What could be better?"}
                            {rating === 3 && "Okay. Any suggestions?"}
                            {rating === 2 && "Not great. Tell us more."}
                            {rating === 1 && "Terrible. We're sorry."}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        Additional Comments (Optional)
                    </label>
                    <Textarea
                        placeholder="Share your thoughts..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="resize-none min-h-[100px] border-slate-200 focus:border-primary/50"
                    />
                </div>
            </div>
        </Modal>
    );
};
