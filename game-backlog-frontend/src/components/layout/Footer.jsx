import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter } from 'lucide-react';
import Logo from '../../assets/logo.svg?react';

const Footer = () => {
    return (
        <footer className="bg-primary-navy border-t border-gray-800 text-gray-400 py-12 lg:py-16 relative z-10 w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 mb-12">

                    {/* Brand Column */}
                    <div className="md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity w-fit">
                            <Logo className="h-8 w-auto text-white" />
                            <span className="text-white text-2xl font-bold">Stackd</span>
                        </Link>
                        <p className="text-sm leading-relaxed max-w-sm mb-6">
                            Organize your game collection, track your progress, discover new titles, and share your gaming journey with friends.
                        </p>
                        <div className="flex gap-4">
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary-navy-dark border border-gray-800 rounded-full hover:text-white hover:border-gray-600 transition-all">
                                <Github size={20} />
                                <span className="sr-only">GitHub</span>
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 bg-primary-navy-dark border border-gray-800 rounded-full hover:text-white hover:border-gray-600 transition-all">
                                <Twitter size={20} />
                                <span className="sr-only">Twitter</span>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links Column */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Explore</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link to="/explore" className="hover:text-primary-yellow transition-colors">Games</Link>
                            </li>
                            <li>
                                <Link to="/collections" className="hover:text-primary-yellow transition-colors">Collections</Link>
                            </li>
                            <li>
                                <Link to="/explore?timeRange=last_year" className="hover:text-primary-yellow transition-colors">Best of Year</Link>
                            </li>
                            <li>
                                <Link to="/explore?anticipated=true" className="hover:text-primary-yellow transition-colors">Upcoming Releases</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div>
                        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h3>
                        <ul className="space-y-3 text-sm">
                            <li>
                                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                            </li>
                            <li>
                                <Link to="#" className="hover:text-white transition-colors">Cookie Policy</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                    <p>© {new Date().getFullYear()} Stackd. All rights reserved.</p>
                    <p className="flex items-center gap-2">
                        Game data and images powered by
                        <a href="https://www.igdb.com/api" target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-primary-yellow transition-colors">
                            IGDB
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
