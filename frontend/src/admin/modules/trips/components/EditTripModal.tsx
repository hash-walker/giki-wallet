import { useTripCreateStore } from '../store';
import { TripCreateForm } from './TripCreateForm';
import { Modal } from '@/shared/components/ui/Modal';

export const EditTripModal = () => {
    const { editingTrip, setEditingTrip } = useTripCreateStore();

    const isOpen = !!editingTrip;

    const handleClose = () => {
        setEditingTrip(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Edit Trip: ${editingTrip?.route_name || ''}`}
            size="lg"
            className="md:w-[900px]" // Custom width for the large form
        >
            <div className="mb-4">
                <p className="text-sm text-gray-500">
                    Update trip schedule and capacity. Ensure capacity changes do not conflict with sold tickets.
                </p>
            </div>
            {/* We pass onSuccess to close the modal after update */}
            <TripCreateForm onSuccess={handleClose} />
        </Modal>
    );
};
