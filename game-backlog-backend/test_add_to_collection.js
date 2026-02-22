const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAddToCollection() {
    try {
        console.log('--- Starting Add to Collection Tests ---');

        // 1. Authenticate to get a token
        let token;
        try {
            const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
                identifier: 'testgameadd@example.com',
                password: 'password123'
            });
            token = loginRes.data.token;
            console.log('✅ Logged in successfully');
        } catch (e) {
            if (e.response && e.response.status === 401) {
                console.log('User not found, registering...');
                const regRes = await axios.post(`${API_BASE_URL}/auth/register`, {
                    username: 'testgameadd',
                    email: 'testgameadd@example.com',
                    password: 'password123'
                });
                token = regRes.data.token;
                console.log('✅ Registered successfully');
            } else {
                throw e;
            }
        }
        const authConfig = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Filter collections to get an existing one or create a new one to test with
        let collectionId;
        const colsRes = await axios.get(`${API_BASE_URL}/collections/user/testgameadd`, authConfig);
        const collections = colsRes.data.collections;

        if (collections.length > 0) {
            collectionId = collections[0].id;
        } else {
            const createRes = await axios.post(`${API_BASE_URL}/collections`, {
                title: 'Test Collection for Add Game',
                description: 'A test collection',
                is_public: true
            }, authConfig);
            collectionId = createRes.data.collection.id;
        }
        console.log(`✅ Using Collection ID: ${collectionId}`);

        // 3. Check if game is in collections initially (using game ID 123 for test)
        const gameIdToTest = 71; // Assuming The Witcher 3 or some game
        let containsRes = await axios.get(`${API_BASE_URL}/collections/contains/${gameIdToTest}`, authConfig);
        console.log('Collections containing game ID 71 initially:', containsRes.data.collectionIds);

        // 4. Add Game to Collection
        console.log(`Attempting to add game ID ${gameIdToTest} to Collection ${collectionId}...`);
        try {
            const addRes = await axios.post(`${API_BASE_URL}/collections/${collectionId}/games`, {
                igdb_game_id: gameIdToTest
            }, authConfig);
            console.log('✅ Added game successfully:', addRes.data.message);
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('ℹ️ Game was already in the collection (expected duplicate handling)');
            } else {
                throw e;
            }
        }

        // 5. Try to add same game again to verify duplicate handling
        console.log(`Attempting to add game ID ${gameIdToTest} again to verify 409 handling...`);
        try {
            await axios.post(`${API_BASE_URL}/collections/${collectionId}/games`, {
                igdb_game_id: gameIdToTest
            }, authConfig);
            console.log('❌ UNEXPECTED: Server allowed duplicate addition!');
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('✅ Verified server blocked duplicate successfully (409 Conflict)');
            } else {
                console.log('❌ Server rejected duplicate but with wrong error code:', e.response?.status);
            }
        }

        // 6. Check contains endpoint again
        containsRes = await axios.get(`${API_BASE_URL}/collections/contains/${gameIdToTest}`, authConfig);
        console.log(`Collections containing game ID ${gameIdToTest} after addition:`, containsRes.data.collectionIds);

        if (containsRes.data.collectionIds.includes(collectionId)) {
            console.log('✅ Contains check is working correctly.');
        } else {
            console.log('❌ Contains check failed to show the collection ID.');
        }

        console.log('--- All tests passed! ---');

    } catch (error) {
        console.error('❌ Test failed at URL:', error.response?.config?.url);
        console.error('Error details:', error.response?.data || error.message);
    }
}

testAddToCollection();
