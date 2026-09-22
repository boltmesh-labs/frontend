import { Container } from 'react-bootstrap';
import { usePageTitle } from '@/hooks/usePageTitle';
import { COMPANY_NAME, SUPPORT_EMAIL } from '@/utils/config';

const PrivacyPolicy = () => {
  usePageTitle(
    `Privacy Policy | ${COMPANY_NAME}`,
    `Learn how ${COMPANY_NAME} protects your personal data and maintains a strict no-logs policy.`
  );

  return (
    <Container className="py-5 text-start" style={{ maxWidth: '800px' }}>
      <h1 className="fw-bold text-body mb-1 h2">Privacy Policy</h1>
      <p className="text-muted small mb-4">
        <strong>Last updated:</strong> April 17, 2025
      </p>

      <p className="lead text-secondary mb-4">
        At {COMPANY_NAME} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), we prioritize
        your privacy. This policy explains what information we collect, how we use it, and how you
        can manage your data.
      </p>

      <hr className="my-4 opacity-25" />

      <h2 className="h4 fw-bold text-body mt-4 mb-3">1. Information We Collect</h2>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">
          <strong>Account Details:</strong> We collect your username, email address, and an
          encrypted password when you sign up.
        </li>
        <li className="mb-2">
          <strong>Payment Info:</strong> We save basic transaction records like invoices and
          confirmation details, but we never see or store your credit card or banking information.
        </li>
        <li className="mb-2">
          <strong>App Diagnostics:</strong> To keep our app running smoothly and securely, we may
          collect basic technical logs, such as crash and error reports.
        </li>
        <li className="mb-2">
          <strong>Cookies:</strong> We use only essential cookies to keep you safely logged in and
          manage your current session.
        </li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">2. What We Don’t Collect</h2>
      <p className="text-secondary lh-lg">
        <strong>Strict No-Logs Policy:</strong> We do not monitor, store, or log your browsing
        history, VPN traffic, website destinations, DNS queries, or connection timestamps.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">3. How We Use Your Information</h2>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">To manage your account and give you access to our secure network</li>
        <li className="mb-2">To process billing and manage your active subscriptions</li>
        <li className="mb-2">
          To fix technical issues and improve our apps based on user feedback
        </li>
        <li className="mb-2">To respond quickly to your support tickets and requests</li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">4. Data Security</h2>
      <p className="text-secondary lh-lg">
        We use industry-standard security practices to keep your data safe. However, please remember
        that no system on the internet is completely risk-free. While we do everything we can to
        protect your profile, absolute security cannot be promised online.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">5. Sharing of Information</h2>
      <p className="text-secondary mb-3">
        Your data is safe with us. We never sell your personal information. We only share it in the
        following necessary situations:
      </p>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">
          To follow legal rules, such as answering a valid court order or official law enforcement
          request.
        </li>
        <li className="mb-2">
          With trusted partners who help us run our service (like processing your payments or
          sending transaction emails), under strict agreements that keep your details confidential.
        </li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">6. Your Rights</h2>
      <p className="text-secondary lh-lg">
        You can look at, update, or completely delete your account details at any time. To manage
        your information, just send us an email at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-decoration-none fw-medium text-primary">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">7. Changes to This Policy</h2>
      <p className="text-secondary lh-lg">
        We may change this privacy policy occasionally. When we update it, we will switch the date
        at the top of the page. Using the app after an update means you agree to the new version.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">8. Contact Us</h2>
      <p className="text-secondary lh-lg">
        If you have any questions about this document or want to talk to us about your data, feel
        free to drop us a line at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-decoration-none fw-medium text-primary">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </Container>
  );
};

export default PrivacyPolicy;
