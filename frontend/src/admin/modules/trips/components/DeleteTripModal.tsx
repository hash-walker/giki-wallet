import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Modal } from '@/shared/components/ui/Modal';

interface DeleteTripModalProps {
    isOpen: boolean;
    tripName: string;
    departureTime: string;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export const DeleteTripModal = ({
    isOpen,
    tripName,
    departureTime,
    onClose,
    onConfirm,
    isDeleting
}: DeleteTripModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Delete Trip
                </h3>

                <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete the trip <span className="font-semibold text-gray-900">{tripName}</span> departing at <span className="font-semibold text-gray-900">{departureTime}</span>?
                    <br />
                    <span className="text-red-600 font-medium mt-2 block">This action cannot be undone.</span>
                </p>

                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Trip'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
