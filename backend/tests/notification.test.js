import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Notification from '../src/models/Notification.model.js';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import Counter from '../src/models/Counter.model.js';
import AuditLog from '../src/models/AuditLog.model.js';
import { notify, emailSender } from '../src/services/notification.service.js';

import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../src/controllers/notification.controller.js';

import { submitCertificateRequest } from '../src/controllers/intern.controller.js';
import { reviewRequestAsTL } from '../src/controllers/teamleader.controller.js';
import { finalizeRequest, finalizeCertificate } from '../src/controllers/admin.controller.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

test('TASK E: NOTIFICATIONS FEATURE TEST SUITE', async (t) => {
  const internId = new mongoose.Types.ObjectId().toString();
  const otherInternId = new mongoose.Types.ObjectId().toString();
  const tlId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const reqId = new mongoose.Types.ObjectId().toString();

  await t.test('1. Notification model schema exposes required fields and compound index', async () => {
    const schema = Notification.schema;
    assert.equal(schema.path('userId').instance, 'ObjectId');
    assert.equal(schema.path('userId').options.ref, 'user');
    assert.equal(schema.path('type').instance, 'String');
    assert.equal(schema.path('title').instance, 'String');
    assert.equal(schema.path('message').instance, 'String');
    assert.equal(schema.path('requestId').instance, 'ObjectId');
    assert.equal(schema.path('isRead').instance, 'Boolean');
    assert.equal(schema.path('readAt').instance, 'Date');

    // Verify compound index
    const indexes = schema.indexes();
    const hasCompoundIndex = indexes.some(
      ([spec]) => spec.userId === 1 && spec.isRead === 1 && spec.createdAt === -1
    );
    assert.ok(hasCompoundIndex, 'Index on { userId: 1, isRead: 1, createdAt: -1 } must be registered');
  });

  await t.test('2. notify() saves in-app notification with isRead: false and sends mail when email: true', async () => {
    let capturedCreate = null;
    let emailSent = false;
    let sentEmailPayload = null;

    const origCreate = Notification.create;
    const origFindById = User.findById;
    const origSendEmail = emailSender.send;

    Notification.create = async (doc) => {
      capturedCreate = doc;
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    User.findById = (id) => ({
      select: async () => ({
        _id: id,
        email: 'intern@uptoskills.com',
        fullName: 'Jane Doe',
      }),
    });

    emailSender.send = async (payload) => {
      emailSent = true;
      sentEmailPayload = payload;
      return { messageId: 'test-123' };
    };

    try {
      const res = await notify(internId, 'REQUEST_APPROVED', {
        title: 'Request Approved',
        message: 'Your certificate request CERT-2026-0001 is approved.',
        requestId: reqId,
        email: true,
      });

      assert.ok(res, 'Notification object should be returned');
      assert.equal(capturedCreate.userId, internId);
      assert.equal(capturedCreate.type, 'REQUEST_APPROVED');
      assert.equal(capturedCreate.isRead, false);
      assert.equal(capturedCreate.requestId, reqId);
      assert.ok(emailSent, 'sendEmail must be called when email: true');
      assert.equal(sentEmailPayload.to, 'intern@uptoskills.com');
      assert.ok(sentEmailPayload.subject.includes('Request Approved'));
    } finally {
      Notification.create = origCreate;
      User.findById = origFindById;
      emailSender.send = origSendEmail;
    }
  });

  await t.test('3. notify() handles email failure gracefully without failing caller', async () => {
    const origCreate = Notification.create;
    const origFindById = User.findById;
    const origSendEmail = emailSender.send;

    Notification.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    User.findById = (id) => ({
      select: async () => ({
        _id: id,
        email: 'fail@uptoskills.com',
        fullName: 'Fail User',
      }),
    });
    emailSender.send = async () => {
      throw new Error('Brevo SMTP timeout');
    };

    try {
      // Must NOT reject
      await assert.doesNotReject(async () => {
        const notif = await notify(internId, 'REQUEST_REJECTED', {
          title: 'Request Rejected',
          message: 'Reason: missing documents',
          email: true,
        });
        assert.ok(notif, 'Notification should still be saved even if email fails');
      });
    } finally {
      Notification.create = origCreate;
      User.findById = origFindById;
      emailSender.send = origSendEmail;
    }
  });

  await t.test('4. Endpoints: getMyNotifications scopes to req.user.id and supports unread filter', async () => {
    const origFind = Notification.find;
    const origCount = Notification.countDocuments;

    let capturedQuery = null;

    Notification.find = (query) => {
      capturedQuery = query;
      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => [
                { _id: new mongoose.Types.ObjectId(), userId: internId, isRead: false, title: 'Test 1' },
              ],
            }),
          }),
        }),
      };
    };

    Notification.countDocuments = async (query) => {
      if (query.isRead === false) return 1;
      return 1;
    };

    try {
      const req = {
        user: { id: internId },
        query: { unread: 'true', page: '1', limit: '10' },
      };
      const res = mockRes();

      await getMyNotifications(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(capturedQuery.userId, internId);
      assert.equal(capturedQuery.isRead, false);
      assert.equal(res.body.notifications.length, 1);
      assert.equal(res.body.unreadCount, 1);
    } finally {
      Notification.find = origFind;
      Notification.countDocuments = origCount;
    }
  });

  await t.test('5. Endpoints: getUnreadNotificationCount returns unread count for badge', async () => {
    const origCount = Notification.countDocuments;
    Notification.countDocuments = async (query) => {
      assert.equal(query.userId, internId);
      assert.equal(query.isRead, false);
      return 7;
    };

    try {
      const req = { user: { id: internId } };
      const res = mockRes();

      await getUnreadNotificationCount(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.unreadCount, 7);
    } finally {
      Notification.countDocuments = origCount;
    }
  });

  await t.test('6. Endpoints: markNotificationAsRead returns 404 if notification belongs to another user', async () => {
    const notifId = new mongoose.Types.ObjectId().toString();
    const origFindOne = Notification.findOne;

    // Simulate notification belonging to someone else
    Notification.findOne = async ({ _id, userId }) => {
      if (userId === internId) return null; // Scoped query returns null
      return { _id, userId: otherInternId, isRead: false };
    };

    try {
      const req = {
        params: { id: notifId },
        user: { id: internId },
      };
      const res = mockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.message, 'Notification not found');
    } finally {
      Notification.findOne = origFindOne;
    }
  });

  await t.test('7. Endpoints: markNotificationAsRead successfully marks own notification as read', async () => {
    const notifId = new mongoose.Types.ObjectId().toString();
    const origFindOne = Notification.findOne;

    let saved = false;
    const mockDoc = {
      _id: notifId,
      userId: internId,
      isRead: false,
      readAt: null,
      save: async function () {
        saved = true;
        return this;
      },
    };

    Notification.findOne = async () => mockDoc;

    try {
      const req = {
        params: { id: notifId },
        user: { id: internId },
      };
      const res = mockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockDoc.isRead, true);
      assert.ok(mockDoc.readAt instanceof Date);
      assert.ok(saved);
    } finally {
      Notification.findOne = origFindOne;
    }
  });

  await t.test('8. Endpoints: markAllNotificationsAsRead marks all user notifications read', async () => {
    const origUpdateMany = Notification.updateMany;
    let capturedUpdate = null;

    Notification.updateMany = async (filter, update) => {
      capturedUpdate = { filter, update };
      return { modifiedCount: 5 };
    };

    try {
      const req = { user: { id: internId } };
      const res = mockRes();

      await markAllNotificationsAsRead(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(capturedUpdate.filter.userId, internId);
      assert.equal(capturedUpdate.filter.isRead, false);
      assert.equal(capturedUpdate.update.$set.isRead, true);
      assert.equal(res.body.modifiedCount, 5);
    } finally {
      Notification.updateMany = origUpdateMany;
    }
  });

  await t.test('9. Trigger: Request submitted with missing TL skips gracefully without error', async () => {
    const origFindById = User.findById;
    const origFindOne = User.findOne;
    const origCertReqFindOne = CertificateRequest.findOne;
    const origCertReqCreate = CertificateRequest.create;
    const origCounterUpdate = Counter.findOneAndUpdate;
    const origAuditCreate = AuditLog.create;

    User.findById = async () => ({
      _id: internId,
      fullName: 'Intern Without TL',
      internCode: 'INT009',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-01'),
      internshipDetails: { teamleaderEmail: 'notfound@uptoskills.com' },
    });

    CertificateRequest.findOne = async () => null;
    CertificateRequest.create = async (doc) => ({ _id: reqId, requestNumber: 'CERT-2026-00001', ...doc });
    User.findOne = async () => null; // No matching TL found

    Counter.findOneAndUpdate = async () => ({ _id: 'certRequest', seq: 1 });
    AuditLog.create = async () => ({ _id: new mongoose.Types.ObjectId() });

    try {
      const req = {
        user: { id: internId },
        body: { certificateType: 'offer_letter', reason: 'College requirement' },
      };
      const res = mockRes();

      await submitCertificateRequest(req, res);

      assert.equal(res.statusCode, 201, 'Request must succeed even if TL does not exist');
      assert.ok(res.body.request);
    } finally {
      User.findById = origFindById;
      User.findOne = origFindOne;
      CertificateRequest.findOne = origCertReqFindOne;
      CertificateRequest.create = origCertReqCreate;
      Counter.findOneAndUpdate = origCounterUpdate;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('10. Trigger: TL review forward triggers in-app notification to all admins', async () => {
    const origReqFindById = CertificateRequest.findById;
    const origUserFind = User.find;
    const origNotifCreate = Notification.create;

    const notifiedAdminIds = [];

    CertificateRequest.findById = async () => ({
      _id: reqId,
      requestNumber: 'CERT-2026-00002',
      status: 'pending',
      save: async () => {},
    });

    User.find = (query) => {
      assert.equal(query.role, 'admin');
      return {
        select: async () => [
          { _id: new mongoose.Types.ObjectId() },
          { _id: new mongoose.Types.ObjectId() },
        ],
      };
    };

    Notification.create = async (doc) => {
      notifiedAdminIds.push(doc.userId.toString());
      return doc;
    };

    try {
      const req = {
        params: { id: reqId },
        user: { id: tlId, fullName: 'TL Dave' },
        body: { action: 'forward' },
      };
      const res = mockRes();

      await reviewRequestAsTL(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(notifiedAdminIds.length, 2, 'Both admins should be notified');
    } finally {
      CertificateRequest.findById = origReqFindById;
      User.find = origUserFind;
      Notification.create = origNotifCreate;
    }
  });
});
