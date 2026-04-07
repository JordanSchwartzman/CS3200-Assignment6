const { MongoClient } = require('mongodb');
const { createClient } = require('redis');

const mongoClient = new MongoClient('mongodb://localhost:27017');
const redisClient = createClient({ url: 'redis://localhost:6379' });

async function main() {
  await mongoClient.connect();
  await redisClient.connect();

  const col = mongoClient.db('ieeevisTweets').collection('tweet');

  await redisClient.del('leaderboard');

  const cursor = col.find({});
  for await (const tweet of cursor) {
    if (tweet.user?.screen_name) {
      await redisClient.zIncrBy('leaderboard', 1, tweet.user.screen_name);
    }
  }

  const top10 = await redisClient.zRangeWithScores('leaderboard', 0, 9, { REV: true });
  console.log('Top 10 users by tweet count:');
  top10.forEach((entry, i) => {
    console.log(`${i + 1}. @${entry.value} — ${entry.score} tweets`);
  });

  await mongoClient.close();
  await redisClient.quit();
}

main().catch(console.error);
