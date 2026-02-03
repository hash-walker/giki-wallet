import React from 'react';
import { Github, Linkedin, Instagram, Globe, MessageSquare, Heart, Shield, Zap, Users } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

const AboutPage = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
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
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
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
                    <h2 className="text-3xl font-bold text-gray-900">The Creators</h2>
                    <p className="text-gray-500">The minds behind the innovation</p>
                </div>

                <div className="flex flex-wrap justify-center gap-8">
                    {/* Add creator profile card here when information is available. For now, a generic stylized one */}
                    <div className="group relative w-full max-w-sm">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                        <div className="relative bg-white p-8 rounded-2xl border border-gray-100 flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                                <Users className="w-10 h-10 text-gray-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-gray-900">Hamza & Team</h3>
                                <p className="text-sm font-medium text-primary">Full Stack Developers & Visionaries</p>
                            </div>
                            <p className="text-gray-600 text-sm">
                                Passionate about solving campus problems through elegant code and user-centric design.
                            </p>

                            {/* Social Links */}
                            <div className="flex items-center gap-3 pt-4">
                                <SocialLink icon={Linkedin} href="https://linkedin.com" label="LinkedIn" />
                                <SocialLink icon={Github} href="https://github.com" label="GitHub" />
                                <SocialLink icon={Instagram} href="https://instagram.com" label="Instagram" />
                                <SocialLink icon={Globe} href="https://blog.gikiwallet.com" label="Blog" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-center space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Join the Revolution</h2>
                <p className="text-gray-400 max-w-lg mx-auto">
                    Experience the future of campus payments today. Safe, smart, and built for you.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-4">
                    <Button className="bg-primary hover:bg-primary/90 rounded-full h-12 px-8 font-bold">
                        Get Started
                    </Button>
                    <Button variant="outline" className="border-gray-700 text-white hover:bg-white/10 rounded-full h-12 px-8 font-bold">
                        Contact Support
                    </Button>
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
        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all duration-300 transform hover:-translate-y-1 shadow-sm"
    >
        <Icon className="w-5 h-5" />
    </a>
);

export default AboutPage;
