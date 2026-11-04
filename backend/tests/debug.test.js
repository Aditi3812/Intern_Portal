import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

it('debug ObjectId comparison', async () => {
  const internIds = Array.from({ length: 3 }, () => new ObjectId());
  const r = { userId: internIds[0] };
  
  // Test direct comparison
  const direct = r.userId.toString() === internIds[0].toString();
  console.log('direct toString match:', direct);
  
  // Test $in comparison
  const filterVal = { $in: internIds };
  console.log('has $in:', '$in' in filterVal);
  console.log('keys all start with $:', Object.keys(filterVal).every(k => k.startsWith('$')));
  
  const inMatch = filterVal.$in.some(id => id.toString() === r.userId.toString());
  console.log('some match:', inMatch);
});
