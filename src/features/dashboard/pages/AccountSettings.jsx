import { useEffect, useState } from 'react';
import { Alert, Card, Col, Form, Nav, Row, Tab } from 'react-bootstrap';
import { PageLoader } from '@/components/PageLoader';
import { StatusAlert } from '@/components/StatusAlert';
import { AsyncButton } from '@/components/AsyncButton';
import { toast } from 'react-toastify';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useForm } from '@/hooks/useForm';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useDashboardProfile,
  useUpdateProfile,
  useChangePassword,
  useRequestAccountDeletion,
} from '@/features/dashboard/hooks/useDashboard';
import { DashboardContainer } from '@/features/dashboard/components/DashboardContainer';
import { DashboardHeader } from '../components/DashboardHeader';
import { handleApiError } from '@/utils/errorHandler';
import { COMPANY_NAME } from '@/utils/config';

const ProfileForm = ({ initialUser }) => {
  const {
    values: profile,
    handleChange,
    setValue,
  } = useForm({
    username: initialUser?.username || '',
    email: initialUser?.email || '',
    currentPassword: '',
  });
  const updateMutation = useUpdateProfile();
  // Pending state comes straight from the mutation (no parallel useState flag).
  const isPending = updateMutation.isPending;
  // Confirmation modal shared by this form's submit flow (the typed-DELETE
  // guard on the delete tab is the exception and keeps its own flow).
  const { confirm, confirmDialog } = useConfirm();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!profile.currentPassword) {
      toast.error('Current password is required to update email or username.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Save Profile Changes?',
      message:
        'Your username and email address will be updated across the account immediately. You will keep the same current password.',
      confirmText: 'Save Changes',
      confirmVariant: 'primary',
    });
    if (!isConfirmed) return;

    try {
      await updateMutation.mutateAsync({
        username: profile.username,
        email: profile.email,
        current_password: profile.currentPassword,
      });
      setValue('currentPassword', '');
    } catch {
      // Success/error feedback (the toasts) is owned by useUpdateProfile; the
      // rejection is contained here so the page does not double-toast.
      // handleApiError is NOT called again on purpose.
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="formUsername">
            <Form.Label className="small fw-bold text-secondary">Username</Form.Label>
            <Form.Control
              type="text"
              name="username"
              autoComplete="username"
              value={profile.username}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group controlId="formEmail">
            <Form.Label className="small fw-bold text-secondary">Email Address</Form.Label>
            <Form.Control
              type="email"
              name="email"
              autoComplete="email"
              value={profile.email}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>

        <Col xs={12}>
          <Form.Group controlId="formProfileCurrentPassword">
            <Form.Label className="small fw-bold text-secondary">Current Password</Form.Label>
            <Form.Control
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              value={profile.currentPassword}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Col>

        <Col xs={12} className="mt-4">
          <AsyncButton
            type="submit"
            variant="primary"
            className="fw-bold py-2 px-4 shadow-sm"
            loading={isPending}
            loadingLabel="Saving Changes..."
          >
            Save Profile Changes
          </AsyncButton>
        </Col>
      </Row>

      {confirmDialog}
    </Form>
  );
};

const PasswordForm = ({ username }) => {
  const {
    values: passwords,
    handleChange,
    reset,
  } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const changePasswordMutation = useChangePassword();
  // Pending state comes straight from the mutation (no parallel useState flag).
  const isPending = changePasswordMutation.isPending;
  const { confirm, confirmDialog } = useConfirm();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (passwords.currentPassword === passwords.newPassword) {
      toast.error('New password must be different from your current password.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Update Password?',
      message:
        'Your login credentials will change immediately. Make sure you remember the new password before continuing.',
      confirmText: 'Update Password',
      confirmVariant: 'primary',
    });
    if (!isConfirmed) return;

    try {
      await changePasswordMutation.mutateAsync({
        current_password: passwords.currentPassword,
        new_password: passwords.newPassword,
      });
      reset();
    } catch {
      // Success/error feedback (the toasts) is owned by useChangePassword; the
      // rejection is contained here so the page does not double-toast.
      // handleApiError is NOT called again on purpose.
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <input
        type="text"
        name="username"
        value={username || ''}
        autoComplete="username"
        readOnly
        className="d-none"
        tabIndex={-1}
      />
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="formNewPassword">
            <Form.Label className="small fw-bold text-secondary">New Password</Form.Label>
            <Form.Control
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="formConfirmPassword">
            <Form.Label className="small fw-bold text-secondary">Confirm New Password</Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </Form.Group>
        </Col>
        <Col xs={12}>
          <Form.Group controlId="formCurrentPassword">
            <Form.Label className="small fw-bold text-secondary">Current Password</Form.Label>
            <Form.Control
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </Form.Group>
        </Col>
        <Col xs={12} className="mt-4">
          <AsyncButton
            type="submit"
            variant="primary"
            className="fw-bold py-2 px-4 shadow-sm"
            loading={isPending}
            loadingLabel="Updating Password..."
          >
            Update Password
          </AsyncButton>
        </Col>
      </Row>

      {confirmDialog}
    </Form>
  );
};

const DeleteAccountForm = ({ onEmailSent }) => {
  const { values, handleChange } = useForm({ confirmDelete: '' });

  const deleteRequestMutation = useRequestAccountDeletion();
  const isPending = deleteRequestMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (values.confirmDelete !== 'DELETE') {
      toast.error('Please type DELETE to confirm account deletion.');
      return;
    }

    try {
      await deleteRequestMutation.mutateAsync();
      // Flip the parent into its "confirmation email sent" panel.
      onEmailSent?.();
      toast.info('Confirmation email sent. Click the link in your inbox to complete deletion.');
    } catch (err) {
      handleApiError(err);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group controlId="formConfirmDelete">
            <Form.Label className="small fw-bold text-danger">
              Type <span className="font-monospace">DELETE</span> to confirm:
            </Form.Label>
            <Form.Control
              type="text"
              name="confirmDelete"
              autoComplete="off"
              value={values.confirmDelete}
              onChange={handleChange}
              placeholder="DELETE"
              className="bg-body-tertiary"
            />
          </Form.Group>
        </Col>
        <Col xs={12}>
          <AsyncButton
            type="submit"
            variant="danger"
            className="fw-bold py-2 px-4 shadow-sm"
            disabled={values.confirmDelete !== 'DELETE'}
            loading={isPending}
            loadingLabel="Deleting Account..."
          >
            Delete Account
          </AsyncButton>
        </Col>
      </Row>
    </Form>
  );
};

const AccountSettings = () => {
  // Flipped by DeleteAccountForm once the deletion request succeeds; drives the
  // confirmation panel below. (Previously a dead useState(false) with no setter,
  // which made that panel unreachable.)
  const [deleteEmailSent, setDeleteEmailSent] = useState(false);

  usePageTitle(
    `Account Settings | ${COMPANY_NAME}`,
    `Update your profile, change your password, and manage security settings.`
  );

  const { data: user, isLoading, isError, error, refetch } = useDashboardProfile();

  useEffect(() => {
    if (isError) toast.error('Failed to load profile settings. Please refresh.');
  }, [isError]);

  if (isLoading) {
    return (
      <DashboardContainer>
        <PageLoader fullscreen={false} className="py-5" />
      </DashboardContainer>
    );
  }

  if (isError) {
    return (
      <DashboardContainer>
        <DashboardHeader
          title="Account Settings"
          subtitle="Manage your profile details, password, and security settings."
        />
        <StatusAlert
          message={error || 'Failed to load profile settings. Please try again.'}
          onRetry={refetch}
        />
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader
        title="Account Settings"
        subtitle="Manage your profile details, password, and security settings."
      />

      <Tab.Container id="settings-tabs" defaultActiveKey="profile">
        <Row className="g-4 text-start">
          <Col md={4}>
            <Card className="border-0 shadow-sm p-2">
              <Nav variant="pills" className="flex-column gap-1">
                <Nav.Item>
                  <Nav.Link eventKey="profile" className="fw-semibold px-3 py-2">
                    👤 Profile Settings
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="security" className="fw-semibold px-3 py-2">
                    🔒 Security
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="danger" className="fw-semibold px-3 py-2 text-danger">
                    ⚠️ Delete Account
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card>
          </Col>

          <Col md={8}>
            <Tab.Content>
              <Tab.Pane eventKey="profile">
                <Card>
                  <Card.Header>
                    <h5>Personal Profile</h5>
                  </Card.Header>
                  <Card.Body>
                    <ProfileForm initialUser={user} />
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="security">
                <Card>
                  <Card.Header>
                    <h5>Change Password</h5>
                  </Card.Header>
                  <Card.Body>
                    <PasswordForm username={user?.username} />
                  </Card.Body>
                </Card>
              </Tab.Pane>

              <Tab.Pane eventKey="danger">
                <Card className="border-danger bg-danger bg-opacity-10 shadow-sm">
                  <Card.Header className="bg-transparent border-0 pt-4 px-4 pb-0">
                    <h5 className="fw-bold text-danger m-0">Danger Zone</h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <p className="text-muted small mb-3">
                      Deleting your account is permanent. All active subscriptions and configuration
                      access will be revoked.
                    </p>
                    {deleteEmailSent ? (
                      <Alert variant="info" className="mb-0 border-0 shadow-sm">
                        <strong>Confirmation email sent.</strong> We&apos;ve emailed a confirmation
                        link to <strong>{user?.email}</strong>. Click the link in your inbox to
                        complete the deletion. The link expires in 15 minutes.
                      </Alert>
                    ) : (
                      <DeleteAccountForm onEmailSent={() => setDeleteEmailSent(true)} />
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </DashboardContainer>
  );
};

export default AccountSettings;
