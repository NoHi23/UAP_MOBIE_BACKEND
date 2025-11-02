require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry') || process.argv.includes('-d');
const createIndex = process.argv.includes('--create-index');

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    // derive DB name
    let dbName;
    try {
      dbName = (new URL(uri)).pathname.replace('/', '') || 'UAP';
    } catch (e) {
      // fallback
      dbName = process.env.MONGO_DB || 'UAP';
    }
    const db = client.db(dbName);
    console.log('Connected to DB:', db.databaseName);

    // 1) Find duplicate groups by subjectId + lower(cloDetails)
    console.log('Scanning for duplicate CLOs (case-insensitive on cloDetails)...');
    const dupAgg = [
      { $project: { subjectId: 1, cloDetailsLower: { $toLower: '$cloDetails' } } },
      { $group: { _id: { subjectId: '$subjectId', cloDetailsLower: '$cloDetailsLower' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ];

    const dupGroups = await db.collection('clos').aggregate(dupAgg).toArray();
    console.log(`Found ${dupGroups.length} duplicate groups.`);
    if (dupGroups.length === 0) {
      console.log('No duplicates found.');
    } else {
      // Show sample
      dupGroups.slice(0, 20).forEach((g, i) => {
        console.log(`${i+1}. subjectId=${g._id.subjectId}, cloDetailsLower=${g._id.cloDetailsLower}, count=${g.count}`);
      });
    }

    if (dryRun) {
      console.log('\nDry-run mode: no deletions will be performed.');
    } else if (dupGroups.length > 0) {
      console.log('\nProceeding to remove duplicates (keeping the smallest _id per group)...');
      for (const g of dupGroups) {
        const ids = g.ids.map(id => typeof id === 'string' ? ObjectId(id) : id).sort();
        const keep = ids.shift();
        if (ids.length) {
          const delRes = await db.collection('clos').deleteMany({ _id: { $in: ids } });
          console.log(`Kept ${keep}, removed ${ids.length} duplicates for group ${JSON.stringify(g._id)}`);
        }
      }
      console.log('Duplicate removal complete.');
    }

    // 2) Ensure composite unique index exists
    if (createIndex) {
      console.log('\nCreating composite unique index { subjectId:1, cloDetails:1 } with case-insensitive collation...');
      try {
        // If there are still duplicates, index creation will fail
        await db.collection('clos').createIndex(
          { subjectId: 1, cloDetails: 1 },
          { unique: true, name: 'subjectId_1_cloDetails_1', collation: { locale: 'en', strength: 2 } }
        );
        console.log('Index created successfully.');
      } catch (err) {
        console.error('Index creation failed:', err.message);
      }
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
})();
