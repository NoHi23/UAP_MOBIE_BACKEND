require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set in .env');
  process.exit(1);
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const dbName = (new URL(uri)).pathname.replace('/', '') || 'UAP';
    const db = client.db(dbName);
    console.log('Connected to DB:', db.databaseName);

    const indexes = await db.collection('clos').indexes();
    console.log('Existing indexes on clos:');
    indexes.forEach(idx => console.log('-', idx.name, JSON.stringify(idx.key)));

    const singleIndex = indexes.find(i => i.name === 'cloDetails_1' || (i.key && Object.keys(i.key).length === 1 && i.key.cloDetails));
    if (!singleIndex) {
      console.log('No single-field cloDetails index found. Nothing to drop.');
      process.exit(0);
    }

    console.log('Dropping index:', singleIndex.name);
    await db.collection('clos').dropIndex(singleIndex.name);
    console.log('Index dropped successfully.');

    const indexesAfter = await db.collection('clos').indexes();
    console.log('Indexes after change:');
    indexesAfter.forEach(idx => console.log('-', idx.name, JSON.stringify(idx.key)));
  } catch (err) {
    console.error('Error:', err);
    process.exit(2);
  } finally {
    await client.close();
  }
})();
