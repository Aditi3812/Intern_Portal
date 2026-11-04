import { describe, it, before, after } from 'node:test';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import { getCertificateTypes } from '../src/services/adminAnalytics.service.js';

const { ObjectId } = mongoose.Types;
const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(now.getTime() - n * dayMs);

const internIds = Array.from({ length: 10 }, () => new ObjectId());
const adminId = new ObjectId();
const tl1Id = new ObjectId();
const tl2Id = new ObjectId();
const tl3Id = new ObjectId();

const mockInterns = [];
for (let i = 0; i < 10; i++) {
  mockInterns.push({
    _id: internIds[i],
    fullName: `Intern ${String.fromCharCode(65 + i)}`,
    email: `${String.fromCharCode(97 + i)}@test.com`,
    role: 'intern',
    domain: ['Web Development', 'Web Development', 'Data Science', 'Data Science', 'AI & ML', 'AI & ML', 'Web Development', 'Cloud Computing', 'Data Science', 'AI & ML'][i],
    isArchived: i >= 8,
    internshipDetails: {
      status: ['ongoing', 'ongoing', 'ongoing', 'upcoming', 'upcoming', 'completed', 'cancelled', 'cancelled', 'ongoing', 'ongoing'][i],
      teamLeader: [tl1Id, tl1Id, tl1Id, tl2Id, tl2Id, tl3Id, tl3Id, tl3Id, tl2Id, tl3Id][i],
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-30'),
      teamleaderEmail: 'tl@test.com'
    },
    internCode: `INT-${2026}-${i + 1}`,
    createdAt: new Date('2026-01-15'),
    password: 'hashedpassword',
  });
}

const certificateTypes = ['completion_certificate', 'bonafide', 'offer_letter'];
const mockRequests = [];
for (let idx = 0; idx < 20; idx++) {
  mockRequests.push({
    _id: new ObjectId(),
    requestNumber: `CERT-2026-${String(idx).padStart(5, '0')}`,
    userId: internIds[idx % 10],
    internCode: mockInterns[idx % 10].internCode,
    certificateType: certificateTypes[idx % 3],
    status: idx < 4 ? 'pending' : idx < 7 ? 'processing' : idx < 11 ? 'approved' : idx < 15 ? 'completed' : idx < 19 ? 'rejected' : 'cancelled',
    requestedAt: daysAgo(10),
    forwardedAt: null,
    forwardedBy: null,
    reviewedAt: null,
    reviewedBy: null,
    completedAt: null,
    certificateId: null,
    rejectionReason: null,
    updatedAt: daysAgo(10),
  });
}

// Mock functions
const mockQuery = (result) => {
  const chain = {
    select: () => chain,
    populate: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: () => chain,
    then: (resolve) => resolve(result),
  };
  return chain;
};

function filterUsers(filter) {
  let result = [...mockInterns].filter((u) => {
    if (filter.role && u.role !== filter.role) return false;
    return true;
  });
  return result;
}

User.find = (filter = {}) => {
  let result = filterUsers(filter)
    .filter((u) => !(filter.isArchived === false && u.isArchived))
    .map((u) => {
      const { password, resetPasswordToken, resetPasswordExpires, ...safe } = u;
      return safe;
    });
  return mockQuery(result);
};

User.aggregate = async (pipeline) => {
  const groupStage = pipeline.find((s) => s.$group && s.$group._id === '$domain');
  if (groupStage) { return []; }
  return [];
};

User.countDocuments = (filter = {}) => Promise.resolve(filterUsers(filter).length);
User.distinct = (field, filter = {}) => Promise.resolve([]);

function isOperatorExpression(val) {
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return false;
  const keys = Object.keys(val);
  return keys.length > 0 && keys.every((k) => k.startsWith('$'));
}

function matchField(docVal, filterVal) {
  if (filterVal === null) return docVal === null || docVal === undefined;
  if (isOperatorExpression(filterVal)) {
    if ('$in' in filterVal) return filterVal.$in.some((v) => matchField(docVal, v));
    if ('$ne' in filterVal) return !matchField(docVal, filterVal.$ne);
    if ('$gte' in filterVal && '$lte' in filterVal) return docVal != null && docVal >= filterVal.$gte && docVal <= filterVal.$lte;
    if ('$gte' in filterVal) return docVal != null && docVal >= filterVal.$gte;
    if ('$lte' in filterVal) return docVal != null && docVal <= filterVal.$lte;
    return false;
  }
  if (Array.isArray(filterVal)) return filterVal.includes(docVal);
  if (typeof docVal === 'object' && docVal !== null && typeof docVal.toString === 'function') {
    return docVal.toString() === String(filterVal);
  }
  if (typeof filterVal === 'object' && filterVal !== null && typeof filterVal.toString === 'function') {
    return String(docVal) === filterVal.toString();
  }
  return docVal === filterVal;
}

function matchesRequest(cond, r) {
  if (cond.$or && !cond.$or.some((c) => matchesRequest(c, r))) return false;
  if (cond.$and && !cond.$and.every((c) => matchesRequest(c, r))) return false;
  for (const [key, val] of Object.entries(cond)) {
    if (['$or', '$and', '$nor'].includes(key)) continue;
    if (!matchField(r[key], val)) return false;
  }
  return true;
}

function matchesRequestFilter(filter, r) {
  if (filter.$and && !filter.$and.every((c) => matchesRequest(c, r))) return false;
  if (filter.$or && !filter.$or.some((c) => matchesRequest(c, r))) return false;
  for (const [key, val] of Object.entries(filter)) {
    if (['$and', '$or', '$nor'].includes(key)) continue;
    if (!matchField(r[key], val)) return false;
  }
  return true;
}

CertificateRequest.find = (filter = {}) => {
  const result = mockRequests.filter((r) => matchesRequestFilter(filter, r));
  return mockQuery(result);
};

CertificateRequest.countDocuments = (filter = {}) => {
  const result = mockRequests.filter((r) => matchesRequestFilter(filter, r));
  return Promise.resolve(result.length);
};

CertificateRequest.aggregate = async (pipeline) => {
  const groupStage = pipeline.find((s) => s.$group);
  if (groupStage && groupStage.$group && groupStage.$group._id) {
    const matchStage = pipeline.find((s) => s.$match);
    let matched = mockRequests;
    if (matchStage?.$match) {
      const m = matchStage.$match;
      if (m.status) {
        const statuses = Array.isArray(m.status) ? m.status : [m.status];
        matched = matched.filter((r) => statuses.includes(r.status));
      }
      if (m.certificateType) matched = matched.filter((r) => r.certificateType === m.certificateType);
      if (m.userId?.$in) {
        console.log('  Aggregate: internIds count =', m.userId.$in.length);
        matched = matched.filter((r) => m.userId.$in.some((id) => id.toString() === r.userId.toString()));
        console.log('  Aggregate: matched after userId filter =', matched.length);
      }
      if (m.requestedAt?.$gte) matched = matched.filter((r) => r.requestedAt >= m.requestedAt.$gte);
      if (m.requestedAt?.$lte) matched = matched.filter((r) => r.requestedAt <= m.requestedAt.$lte);
    }
    if (groupStage.$group._id === '$certificateType') {
      const counts = {};
      matched.forEach((r) => { counts[r.certificateType] = (counts[r.certificateType] || 0) + 1; });
      console.log('  Aggregate result:', JSON.stringify(counts));
      return Object.entries(counts).map(([type, count]) => ({ _id: type, count }));
    }
  }
  return [];
};

mongoose.connection.readyState = 0;

it('debug getCertificateTypes', async () => {
  const result = await getCertificateTypes({ range: 'all' });
  console.log('Result:', JSON.stringify(result));
});
