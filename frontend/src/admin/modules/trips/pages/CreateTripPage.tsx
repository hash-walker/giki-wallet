import { TripCreateForm } from '../components/TripCreateForm';

export const CreateTripPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Create New Trip</h1>
                <p className="text-muted-foreground">
                    Schedule a new transport trip based on existing route templates.
                </p>
            </div>

            <TripCreateForm />
        </div>
    );
};

export default CreateTripPage;
