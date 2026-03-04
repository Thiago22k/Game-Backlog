const axios = require('axios');
require('dotenv').config();
axios.post('https://id.twitch.tv/oauth2/token?client_id=' + process.env.IGDB_CLIENT_ID + '&client_secret=' + process.env.IGDB_CLIENT_SECRET + '&grant_type=client_credentials').then(res => {
    axios.post('https://api.igdb.com/v4/games', 'fields name, websites.*; where slug = "hollow-knight-silksong";', {
        headers: { 'Client-ID': process.env.IGDB_CLIENT_ID, 'Authorization': 'Bearer ' + res.data.access_token }
    }).then(r => console.log(JSON.stringify(r.data[0].websites, null, 2))).catch(e => console.error(e.response.data))
});
