import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { PaymentAuditLog } from '../schema';
import { GatewayTransactionService } from '../service';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface AuditLogModalProps {
    txnRefNo: string | null;
    onClose: () => void;
}

export const AuditLogModal = ({ txnRefNo, onClose }: AuditLogModalProps) => {
    const [logs, setLogs] = useState<PaymentAuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (txnRefNo) {
            fetchLogs();
        } else {
            setLogs([]);
        }
    }, [txnRefNo]);

    const fetchLogs = async () => {
        if (!txnRefNo) return;
        setIsLoading(true);
        try {
            const data = await GatewayTransactionService.getAuditLogs(txnRefNo);
            setLogs(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch audit logs');
        } finally {
            setIsLoading(false);
        }
    };

    const decodePayload = (payload: any) => {
        if (typeof payload === 'string') {
            try {
                // Determine if it's base64 (Go []byte) or just JSON string
                // Go []byte marshals to base64 string.
                // Try decoding as base64 first
                try {
                    const decoded = atob(payload);
                    // Check if decoded is valid JSON
                    const json = JSON.parse(decoded);
                    return json;
                } catch {
                    // If atob fails or JSON parse fails, maybe it's just a string or JSON string
                    return JSON.parse(payload);
                }
            } catch (e) {
                return payload; // Fallback
            }
        }
        return payload;
    };

    return (
        <Modal
            isOpen={!!txnRefNo}
            onClose={onClose}
            title={`Audit Logs - ${txnRefNo}`}
            size="lg"
        >
            {isLoading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                    No audit logs found for this transaction.
                </div>
            ) : (
                <div className="space-y-4">
                    {(logs || []).map((log) => (

                        <div key={log.id} className="border rounded-lg p-4 bg-gray-50 text-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                    {log.event_type}
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {new Date(log.received_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="grid gap-2 text-xs">
                                <div>
                                    <span className="font-medium">Processed:</span> {log.processed ? 'Yes' : 'No'}
                                </div>
                                {log.process_error && (
                                    <div className="text-red-600">
                                        <span className="font-medium">Error:</span> {log.process_error}
                                    </div>
                                )}
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-gray-600 font-medium hover:text-gray-900">
                                        Raw Payload
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                                        {JSON.stringify(decodePayload(log.raw_payload), null, 2)}
                                    </pre>
                                </details>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};
