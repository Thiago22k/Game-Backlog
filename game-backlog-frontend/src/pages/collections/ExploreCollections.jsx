import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import Navbar from '../../components/layout/Navbar';
import CollectionCard from '../../components/collections/CollectionCard';
import { Library, TrendingUp, Sparkles, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const ExploreCollections = () => {
    const [collections, setCollections] = useState({
        recent: [],
        popular: [],
        interactive: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/collections/explore');
                setCollections(res.data);
            } catch (error) {
                console.error('Error fetching explore collections:', error);
                toast.error('Failed to load collections');
            } finally {
                setLoading(false);
            }
        };

        fetchCollections();
    }, []);

    const CollectionSection = ({ title, icon: Icon, data, colorClass }) => {
        if (!loading && data.length === 0) return null;

        return (
            <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                    <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass}`}>
                        <Icon className={colorClass.replace('bg-', 'text-')} size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-primary-navy-dark border border-gray-800 rounded-xl h-72 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {data.map(collection => (
                            <CollectionCard
                                key={collection.id}
                                collection={collection}
                                showCreator={true}
                                showPrivacy={false}
                            />
                        ))}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="min-h-screen bg-primary-navy">
            <Navbar />

            <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Discover User <span className="text-primary-yellow">Collections</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        Explore game lists curated by the community. Find your next favorite game or share your own taste with the world.
                    </p>
                </div>

                <CollectionSection
                    title="Recently Added"
                    icon={Sparkles}
                    data={collections.recent}
                    colorClass="bg-primary-yellow"
                />

                <CollectionSection
                    title="Most Liked"
                    icon={TrendingUp}
                    data={collections.popular}
                    colorClass="bg-primary-yellow"
                />

                <CollectionSection
                    title="Most Interactive"
                    icon={MessageSquare}
                    data={collections.interactive}
                    colorClass="bg-primary-yellow"
                />

                {!loading && Object.values(collections).every(arr => arr.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20 bg-primary-navy-dark rounded-2xl border border-gray-800">
                        <Library size={64} className="text-gray-600 mb-4" />
                        <h3 className="text-xl font-medium text-white">No collections found</h3>
                        <p className="text-gray-500 mt-2">Check back later for community creations.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ExploreCollections;
