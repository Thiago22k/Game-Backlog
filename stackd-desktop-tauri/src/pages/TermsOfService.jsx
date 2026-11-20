import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import usePageTitle from '../hooks/usePageTitle';

const TermsOfService = () => {
    usePageTitle('Terms of Service');

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            <main className="max-w-4xl mx-auto pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
                    <p className="text-gray-400 text-lg">Last updated: February 28, 2026</p>
                </div>

                <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using Stackd ("we", "our", "the platform"), you accept and agree to be bound by the terms and provisions of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
                        <p>
                            Stackd is a video game backlog tracking platform that allows users to search for games, add them to personal lists, rate them, write reviews, and interact with other users. We rely on the IGDB API for our game metadata and imagery.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. User Conduct</h2>
                        <p className="mb-4">
                            Users are solely responsible for all content (reviews, collections, profile information) that they upload, post, email, transmit, or otherwise make available via the platform. You agree to not use the platform to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Upload, post, or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or invasive of another's privacy.</li>
                            <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
                            <li>Upload, post or otherwise make available any content that infringes any patent, trademark, trade secret, copyright or other proprietary rights of any party.</li>
                            <li>Interfere with or disrupt the platform or servers or networks connected to the platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. Intellectual Property</h2>
                        <p className="mb-4">
                            The platform itself, its original features, functionality, and design are owned by Stackd and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                        </p>
                        <p>
                            Game data, titles, box art, and screenshots are the property of their respective owners and publishers. This data is provided by the IGDB API and used within the platform strictly for informational and organizational purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Account Termination</h2>
                        <p>
                            We may terminate your access to the platform, without cause or notice, which may result in the forfeiture and destruction of all information associated with your account. All provisions of this agreement that, by their nature, should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">6. Changes to This Agreement</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms of Service by posting the updated terms on the Site. Your continued use of the Site after any such changes constitutes your acceptance of the new Terms of Service. Please review this agreement periodically for changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions about this agreement, please contact us at <a href="mailto:support@stackd.com" className="text-primary-yellow hover:underline">support@stackd.com</a>.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default TermsOfService;
