import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {BookingPage} from "@/modules/booking/pages/BookingPage";

function App() {
    return (
        <div className="min-h-screen flex flex-col bg-light-background font-inter">
            <Navbar />

            <main className="flex-1 flex flex-col container mx-auto px-4 py-8 md:py-12">
                <BookingPage />
            </main>

            <Footer />
        </div>
    );
}

export default App;