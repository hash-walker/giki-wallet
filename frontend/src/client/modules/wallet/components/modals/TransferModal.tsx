import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { toast } from '@/lib/toast';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Step 1: Define the form schema with Zod
// This defines what data we expect and validates it
const transferSchema = z.object({
    amount: z
        .string()
        .min(1, 'Amount is required')
        .refine((val) => {
            const num = parseFloat(val);
            return !isNaN(num) && num > 0;
        }, 'Amount must be a positive number'),
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address'),
});

// Step 2: Infer TypeScript type from the schema
// This gives us type safety - TypeScript knows what fields exist
type TransferFormData = z.infer<typeof transferSchema>;

export const TransferModal = ({ isOpen, onClose }: TransferModalProps) => {
    // Step 3: Set up react-hook-form with zod resolver
    // zodResolver connects zod validation to react-hook-form
    const {
        register,           // Register inputs with the form
        handleSubmit,       // Handle form submission
        formState: { errors, isSubmitting }, // Get errors and loading state
        reset,              // Reset form after success
    } = useForm<TransferFormData>({
        resolver: zodResolver(transferSchema),
        defaultValues: {
            amount: '',
            email: '',
        },
    });

    // Step 4: Define what happens when form is submitted
    const onSubmit = async (data: TransferFormData) => {
        try {
            // TODO: Send transfer request to API
            console.log('Transfer request:', {
                email: data.email,
                amount: parseFloat(data.amount),
            });
            
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            
            toast.success('Transfer request sent successfully');
            
            // Close modal and reset form
            reset();
            onClose();
        } catch (error) {
            console.error('Transfer error:', error);
            toast.error('Transfer failed. Please try again.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfer Money"
            footer={
                <Button
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    className="w-full font-semibold text-base md:text-lg py-5 md:py-6 shadow-md hover:shadow-lg transition-all"
                >
                    {isSubmitting ? 'Processing...' : 'Transfer Money'}
                </Button>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Amount Input */}
                <Input
                    label="Amount (RS)"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount to transfer"
                    {...register('amount')} // Connect input to form
                    error={errors.amount?.message} // Show validation error
                />

                {/* Email Input */}
                <div>
                    <Input
                        label="Recipient Email"
                        type="email"
                        placeholder="user@example.com"
                        {...register('email')} // Connect input to form
                        error={errors.email?.message} // Show validation error
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Enter the email address of the user you want to transfer money to
                    </p>
                </div>
            </form>
        </Modal>
    );
};
