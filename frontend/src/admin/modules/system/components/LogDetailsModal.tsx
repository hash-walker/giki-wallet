import React from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { SystemAuditLog } from '../types';

interface Props {
    log: SystemAuditLog | null;
    open: boolean;
    onClose: () => void;
}

export const LogDetailsModal: React.FC<Props> = ({ log, open, onClose }) => {
    if (!log) return null;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Audit Log Details"
            size="lg"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-semibold block text-gray-500">Action</span>
                        <span className="font-medium">{log.action}</span>
                    </div>
                    <div>
                        <span className="font-semibold block text-gray-500">Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {log.status}
                        </span>
                    </div>
                    <div>
                        <span className="font-semibold block text-gray-500">Actor</span>
                        <div>{log.actor_name || 'System'}</div>
                        <div className="text-xs text-gray-400">{log.actor_email}</div>
                    </div>
                    <div>
                        <span className="font-semibold block text-gray-500">Target</span>
                        <div>{log.target_name || '-'}</div>
                        <div className="text-xs text-gray-400">{log.target_email}</div>
                    </div>
                    <div>
                        <span className="font-semibold block text-gray-500">IP Address</span>
                        <span className="font-mono text-xs">{log.ip_address}</span>
                    </div>
                    <div>
                        <span className="font-semibold block text-gray-500">User Agent</span>
                        <span className="text-xs truncate block" title={log.user_agent}>{log.user_agent}</span>
                    </div>
                </div>

                <div className="border rounded-lg bg-gray-50 p-4 mt-4">
                    <h4 className="font-semibold mb-2 text-sm text-gray-700">JSON Details</h4>
                    <div className="bg-white rounded border p-3 h-64 overflow-auto">
                        <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
