require('dotenv').config();
const pool = require('./src/config/database');
const Game = require('./src/models/game.model');
const Review = require('./src/models/review.model');

async function test() {
    try {
        const uRes = await pool.query('SELECT id FROM users LIMIT 1');
        if (uRes.rows.length === 0) {
            console.log("No users in db");
            process.exit(1);
        }
        const userId = uRes.rows[0].id;
        const gameId = 732; // arbitrary number

        console.log("User:", userId, "Game:", gameId);

        // Mimic saveReview logic
        const validRating = null;
        const status = 'completed';
        const subStatus = '';
        const platform = '';
        const containsSpoiler = false;
        const content = 'Test review';

        console.log("Checking if game exists");
        const gameExistsInList = await Game.gameExists(userId, gameId);
        if (gameExistsInList) {
            console.log("updating game");
            await Game.updateGame(userId, gameId, status, validRating);
        } else {
            console.log("adding game");
            await Game.addGame(userId, gameId, status, validRating);
        }

        console.log("Checking if review exists");
        const reviewExists = await Review.reviewExists(userId, gameId);
        let review;
        if (reviewExists) {
            console.log("updating review");
            review = await Review.updateReview(userId, gameId, validRating, status, subStatus, platform, containsSpoiler, content);
        } else {
            console.log("creating review");
            review = await Review.createReview(userId, gameId, validRating, status, subStatus, platform, containsSpoiler, content);
        }

        console.log("SUCCESS");
        console.log(review);
    } catch (err) {
        console.error("DB ERROR: ", err.message);
    } finally {
        pool.end();
    }
}
test();
