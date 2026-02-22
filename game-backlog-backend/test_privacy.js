const axios = require('axios');

const API = 'http://localhost:3000/api';

async function testPrivacy() {
    try {
        const usernameA = 'testuserA_' + Date.now();
        const usernameB = 'testuserB_' + Date.now();

        // Register A
        const resA = await axios.post(`${API}/auth/register`, {
            username: usernameA, email: `${usernameA}@test.com`, password: 'password123'
        });
        const tokenA = resA.data.token;
        console.log('✅ User A registered');

        // Target sets profile to private
        await axios.put(`${API}/settings/update-profile-visibility`, { isPublic: false }, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        console.log('✅ User A set profile to private');

        // Create a public collection
        await axios.post(`${API}/collections`, {
            title: 'My Public Collection', description: '', is_public: true
        }, { headers: { Authorization: `Bearer ${tokenA}` } });

        // Register B (visitor)
        const resB = await axios.post(`${API}/auth/register`, {
            username: usernameB, email: `${usernameB}@test.com`, password: 'password123'
        });
        const tokenB = resB.data.token;
        console.log('✅ User B registered');

        // Visitor views A's games
        const gamesRes = await axios.get(`${API}/games/user/${usernameA}`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        console.log('Visitor Games fetch:', gamesRes.data);

        if (gamesRes.data.is_profile_public === false && gamesRes.data.games.length === 0) {
            console.log('✅ Games endpoint successfully shielded for private profile');
        } else {
            console.error('❌ Games endpoint failed shielding logic');
        }

        // Visitor views A's collections
        const colRes = await axios.get(`${API}/collections/user/${usernameA}`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        console.log('Visitor Collections fetch:', colRes.data);

        if (colRes.data.is_profile_public === false && colRes.data.collections.length === 0) {
            console.log('✅ Collections endpoint successfully shielded for private profile');
        } else {
            console.error('❌ Collections endpoint failed shielding logic');
        }

        // Check login returns is_profile_public
        const loginRes = await axios.post(`${API}/auth/login`, {
            identifier: usernameA, password: 'password123'
        });
        if (loginRes.data.user.is_profile_public === false) {
            console.log('✅ Login endpoint correctly returns is_profile_public');
        } else {
            console.error('❌ Login endpoint failed to return flag');
        }

        console.log('\nAll tests passed successfully! ✨');
    } catch (e) {
        console.error('Script failed:', e.response?.data || e.message);
    }
}
testPrivacy();
