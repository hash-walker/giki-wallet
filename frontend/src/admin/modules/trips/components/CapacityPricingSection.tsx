import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/shared/components/ui/Input';
import { CreateTripFormValues } from '../schema';

export const CapacityPricingSection = () => {
    const { control, formState: { errors } } = useFormContext<CreateTripFormValues>();

    return (
        <div className="space-y-6">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Capacity & Pricing</h2>
                <p className="text-sm text-gray-500">Manage seats and cost</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Controller
                    control={control}
                    name="totalCapacity"
                    render={({ field }) => (
                        <Input
                            label="Total Capacity *"
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            error={errors.totalCapacity?.message}
                        />
                    )}
                />
                <Controller
                    control={control}
                    name="basePrice"
                    render={({ field }) => (
                        <Input
                            label="Base Price *"
                            type="text"
                            placeholder="300"
                            {...field}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    field.onChange(val === '' ? 0 : parseFloat(val));
                                }
                            }}
                            error={errors.basePrice?.message}
                        />
                    )}
                />
            </div>
        </div>
    );
};
