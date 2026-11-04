import { useState } from 'react';
import { setPassword as apiSetPassword } from '../services/intern.service';
import Toast from '../../../shared/components/Toast';

const validatePassword = (pw) => {
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter.';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.';
  return '';
};

const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
  return score;
};

const STRENGTH_TEXT = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export default function ChangePasswordForm({ hasPassword, onSuccess }) {
  const [currentSecret, setCurrentSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const strength = newPassword ? getStrength(newPassword) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!currentSecret.trim()) {
      setError('Current secret is required.');
      return;
    }

    setLoading(true);

    try {
      await apiSetPassword({
        currentSecret,
        newPassword,
      });
      setToast({ type: 'success', message: 'Password set successfully.' });
      setCurrentSecret('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowCurrent(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <form className="settings-form" onSubmit={handleSubmit} noValidate>
        <h3>Change Password</h3>

        <div className="field-group">
          <label htmlFor="current-secret">
            {hasPassword ? 'Current Password' : 'Intern Code or Current Password'}
          </label>
          <div className="input-wrap">
            <input
              id="current-secret"
              type={showCurrent ? 'text' : 'password'}
              value={currentSecret}
              onChange={(e) => setCurrentSecret(e.target.value)}
              placeholder={hasPassword ? 'Enter current password' : 'Enter your intern code'}
              required
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? 'Hide' : 'Show'}
            >
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="new-password">New Password</label>
          <div className="input-wrap">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters with a letter and a number"
              required
            />
            <button
              type="button"
              className="eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide' : 'Show'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {newPassword && (
          <div className="strength-meter">
            <div className="strength-label">
              Strength: <strong>{STRENGTH_TEXT[strength]}</strong>
            </div>
            <div className="strength-bar">
              <div className={`strength-fill strength-${strength}`} style={{ width: `${strength * 25}%` }} />
            </div>
          </div>
        )}

        <div className="field-group">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <div className="input-wrap">
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
            />
          </div>
        </div>

        {error && <div className="field-error">{error}</div>}

        <button type="submit" className="primary" disabled={loading || strength < 2}>
          {loading ? <span className="spinner"></span> : (hasPassword ? 'Update Password' : 'Set Password')}
        </button>
      </form>
    </>
  );
}
