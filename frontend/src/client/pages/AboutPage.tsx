import React from 'react';
import { Github, Linkedin, Instagram, Globe, MessageSquare, Heart, Shield, Zap, Users, Code2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const AboutPage = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 mb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-700 p-8 md:p-12 text-white shadow-2xl">
                <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-sm font-medium">
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Empowering GIKIans</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                        Revolutionizing Campus <br />
                        <span className="text-blue-200">Digital Payments.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-blue-100 max-w-2xl leading-relaxed">
                        GIKI Wallet is more than just an app. It's an intelligent ecosystem designed to simplify daily life at GIK Institute, from seamless ticket bookings to secure digital transactions.
                    </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20" />
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-white rounded-full blur-3xl opacity-10" />
            </div>

            {/* Vision & Mission */}
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    {
                        icon: Heart,
                        title: "Our Vision",
                        desc: "To create a cashless, friction-free campus where every transaction is effortless and secure."
                    },
                    {
                        icon: Shield,
                        title: "Security First",
                        desc: "Enterprise-grade encryption and intelligent fraud detection keep your wallet safe 24/7."
                    },
                    {
                        icon: Users,
                        title: "Community Driven",
                        desc: "Built by students, for students. We listen to your feedback to evolve every single day."
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                            <item.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* Creators Section */}
            <div className="space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900">The Innovator</h2>
                    <p className="text-gray-500">The architectural mind behind the platform</p>
                </div>

                <div className="flex flex-wrap justify-center gap-8">
                    <div className="group relative w-full max-w-md">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                        <div className="relative bg-white p-8 rounded-3xl border border-gray-100 flex flex-col items-center text-center space-y-6">
                            {/* Profile Photo */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary opacity-20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
                                <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden">
                                    <img
                                        src="/hamza.jpeg"
                                        alt="Hamza - Creator of GIKI Wallet"
                                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-gray-50">
                                    <Code2 className="w-5 h-5 text-primary" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Hamza</h3>
                                <p className="text-sm font-bold text-primary uppercase tracking-widest">Lead Developer & Visionary</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 italic">
                                    Microsoft Tech Club GIKI
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed max-w-xs italic">
                                "Passionate about solving campus level problems through elegant software solutions and secure digital infrastructure."
                            </p>

                            {/* Social Links */}
                            <div className="flex items-center gap-4 pt-4">
                                <SocialLink icon={Linkedin} href="https://linkedin.com/in/hamzaxfaraz" label="LinkedIn" />
                                <SocialLink icon={Github} href="https://github.com/hash-walker" label="GitHub" />
                                <SocialLink icon={Instagram} href="https://instagram.com/hash.walker" label="Instagram" />
                                <SocialLink icon={Globe} href="https://hash-walker.github.io/blog" label="Blog" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Join the Revolution</h2>
                    <p className="text-gray-400 max-w-lg mx-auto text-lg">
                        Experience the safest and smartest way to handle your daily campus transactions.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-10 text-lg font-black shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95">
                            Get Started
                        </Button>
                    </div>
                </div>
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-[120px]" />
                </div>
            </div>
        </div>
    );
};

const SocialLink = ({ icon: Icon, href, label }: { icon: any, href: string, label: string }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all duration-500 transform hover:-translate-y-2 hover:rotate-3 shadow-sm hover:shadow-xl hover:shadow-primary/20 border border-gray-100"
    >
        <Icon className="w-6 h-6" />
    </a>
);

export default AboutPage;
