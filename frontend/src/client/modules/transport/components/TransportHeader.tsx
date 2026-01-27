import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function TransportHeader() {
    const navigate = useNavigate();

    return (
        <div className="relative overflow-hidden group bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors duration-500 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-64 h-64 rounded-full bg-accent/5 blur-3xl group-hover:bg-accent/10 transition-colors duration-500 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5 shadow-inner">
                        <Bus className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Transport</h1>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Schedule your ride with ease</p>
                    </div>
                </div>
                <Button
                    onClick={() => navigate('/')}
                    variant="ghost"
                    className="h-12 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 hover:border-slate-200 transition-all self-start md:self-center font-bold text-xs flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Button>
            </div>
        </div>
    );
}
