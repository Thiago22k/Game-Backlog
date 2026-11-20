import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import usePageTitle from '../hooks/usePageTitle';

const LegalPrivacy = () => {
    usePageTitle('Privacy Policy');

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            <main className="max-w-4xl mx-auto pt-32 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
                    <p className="text-gray-400 text-lg">Last updated: February 28, 2026</p>
                </div>

                <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
                        <p className="mb-4">
                            We collect information that you provide directly to us when using Stackd. This includes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Information:</strong> When you register, we collect your username, email address, and password.</li>
                            <li><strong>Profile Data:</strong> Information you choose to add to your profile, such as your bio, avatars, banners, and social links (Twitch, Discord, Steam).</li>
                            <li><strong>User Content:</strong> Game statuses (playing, completed, etc.), ratings, reviews, collection lists, and comments you post on the platform.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
                        <p className="mb-4">
                            We use the information we collect to provide, maintain, and improve our services, including to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Create and manage your Stackd account.</li>
                            <li>Display your gaming backlog, reviews, and collections to you and (if your profile is public) to other users.</li>
                            <li>Personalize your experience and provide game recommendations based on your activity.</li>
                            <li>Send you notification updates related to your account or community interactions (like new followers or likes).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">3. Information Sharing and Disclosure</h2>
                        <p className="mb-4">
                            We do not sell your personal information to third parties. We may share your information in the following situations:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Public Profiles:</strong> If your profile is set to public, your username, avatar, bio, game lists, reviews, and collections are visible to any visitor. You can change your privacy settings at any time.</li>
                            <li><strong>Legal Compliance:</strong> We may disclose information if required by law or to protect the rights and safety of Stackd, our users, or others.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services (IGDB API)</h2>
                        <p>
                            Stackd utilizes the <a href="https://www.igdb.com/api" target="_blank" rel="noopener noreferrer" className="text-primary-yellow hover:underline">IGDB API</a> to fetch video game data, including titles, descriptions, cover art, and screenshots. Please note that when interacting with game data, some interactions may be subject to IGDB's own terms and privacy practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
                        <p>
                            We implement reasonable security measures to protect your personal information, including the use of HttpOnly cookies for authentication tokens and encrypted password storage. However, no absolute security can be guaranteed over the Internet.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights and Choices</h2>
                        <p>
                            You have the right to access, update, or delete your personal information. You can do this directly from your Account Settings. If you wish to permanently delete your account and all associated data, you may use the "Delete Account" feature in your settings or contact our support team.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-white mb-4">7. Contact Us</h2>
                        <p>
                            If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <a href="mailto:privacy@stackd.com" className="text-primary-yellow hover:underline">privacy@stackd.com</a>.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default LegalPrivacy;
