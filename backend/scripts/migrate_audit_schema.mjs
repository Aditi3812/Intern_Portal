import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AuditLog from '../src/models/AuditLog.model.js';

dotenv.config();

// Map legacy action names to the canonical new action names.
const ACTION_MAP = {
  RESTORE_ARCHIVED_INTERN: 'INTERN_RESTORED',
  UPDATE_RETENTION_POLICY: 'RETENTION_POLICY_UPDATED',
  UPDATE_TEMPLATE: 'TEMPLATE_UPDATED',
  CREATE_TEMPLATE: 'TEMPLATE_CREATED',
  EXPORT_ANALYTICS_CSV: 'EXPORT_ANALYTICS',
};

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  const collection = mongoose.connection.collection('audit_logs');
  const docs = await collection.find({}).toArray();
  console.log(`Found ${docs.length} audit log documents.`);

  let migrated = 0;
  for (const doc of docs) {
    if (doc.actorId !== undefined) {
      // Already new schema — skip.
      continue;
    }

    const update = {
      $set: {
        actorId: doc.userId || null,
        actorRole: 'admin',
        action: ACTION_MAP[doc.action] || doc.action,
        targetType: doc.entityType || null,
        targetId: doc.entityId || null,
        meta: doc.description ? { description: doc.description } : {},
        ip: doc.ipAddress || '',
        userAgent: doc.userAgent || '',
      },
      $unset: { userId: '', entityType: '', entityId: '', description: '', ipAddress: '', updatedAt: '' },
    };

    await collection.updateOne({ _id: doc._id }, update);
    migrated += 1;
  }

  console.log(`Migrated ${migrated} documents to the new schema.`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});