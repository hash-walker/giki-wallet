import React from 'react';
import { Github, Linkedin, Instagram, Globe, MessageSquare, Heart, Shield, Zap, Users, Code2, Trophy, Rocket } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const AboutPage = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section - Vanguard Style */}
            <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 md:p-12 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 text-xs font-bold uppercase tracking-wider text-blue-300">
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Vanguard of Techno-Industrial Transformation</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                        The GIKI Wallet <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Project.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed font-medium">
                        Inspired by the GIK Institute's mission to produce graduates distinguished by professional competence and research excellence. GIKI Wallet is a student-led initiative to digitize campus life.
                    </p>
                </div>
                {/* Decorative Elements matching WalletCard */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full blur-[80px] -ml-24 -mb-24 opacity-30" />
            </div>

            {/* Core Pillars - Based on GIKI/Microsoft Club Vision */}
            <div className="grid md:grid-cols-3 gap-6">
                {[
                    {
                        icon: Rocket,
                        title: "Technological Innovation",
                        desc: "Aligning with the Microsoft Imagine Cup spirit to foster entrepreneurship and real-world problem solving."
                    },
                    {
                        icon: Shield,
                        title: "Ethical Rectitude",
                        desc: "Ensuring secure, transparent, and ethical digital transactions in line with GIK's core values."
                    },
                    {
                        icon: Trophy,
                        title: "Professional Excellence",
                        desc: "Built with industry-standard engineering practices to serve as a hallmark of GIKI's technical competence."
                    }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group hover:-translate-y-2">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 mb-6 group-hover:bg-gray-900 group-hover:text-white transition-all duration-500 shadow-inner">
                            <item.icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">{item.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* President Section */}
            <div className="space-y-10">
                <div className="text-center space-y-3">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">The Visionary</h2>
                    <p className="text-gray-500 font-medium text-lg">Leading the digital transformation at GIK Institute</p>
                </div>

                <div className="flex justify-center">
                    <div className="group relative w-full max-w-lg">
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-teal-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative bg-gray-900 px-8 py-12 rounded-[3rem] border border-white/5 flex flex-col items-center text-center space-y-8 shadow-2xl">
                            {/* Profile Photo - Matching Premium Card Aesthetic */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-1000" />
                                <div className="relative w-40 h-40 rounded-full border-4 border-gray-800 shadow-2xl overflow-hidden p-1 bg-gray-800">
                                    <img
                                        src="/hamza.jpeg"
                                        alt="Hamza - President Microsoft Club GIKI"
                                        className="w-full h-full rounded-full object-cover transform transition-transform duration-1000 group-hover:scale-105"
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-primary p-3 rounded-2xl shadow-xl border border-white/10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                    <Code2 className="w-6 h-6 text-white" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-3xl font-black text-white tracking-tighter">Hamza</h3>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 text-sm font-black uppercase tracking-widest">
                                        President Microsoft Club GIKI
                                    </span>
                                </div>
                            </div>

                            <p className="text-gray-400 text-lg leading-relaxed max-w-sm italic font-medium">
                                "Driven by the mission to empower every student at GIKI with tools that bridge the gap between innovation and utility."
                            </p>

                            {/* Social Links - Glassmorphism Style */}
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

            {/* GIKI Branding Footer */}
            <div className="pt-12 border-t border-gray-100 text-center">
                <div className="inline-flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <img src="/logo.svg" className="w-8 h-8" alt="GIKI Logo" />
                    <span className="text-sm font-bold text-gray-900 tracking-widest uppercase">GIK Institute of Engineering Sciences & Technology</span>
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
        className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-300 hover:bg-white hover:text-gray-900 transition-all duration-500 transform hover:-translate-y-2 hover:rotate-3 shadow-sm hover:shadow-2xl hover:shadow-white/10 border border-white/10"
    >
        <Icon className="w-6 h-6" />
    </a>
);

export default AboutPage;
