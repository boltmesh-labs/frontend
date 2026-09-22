import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { COMPANY_NAME, SUPPORT_EMAIL } from '@/utils/config';

const TermsOfService = () => {
  usePageTitle(
    `Terms of Service | ${COMPANY_NAME}`,
    `Read the terms and conditions for using ${COMPANY_NAME} services and applications.`
  );

  return (
    <Container className="py-5 text-start" style={{ maxWidth: '800px' }}>
      <h1 className="fw-bold text-body mb-1 h2">Terms of Service</h1>
      <p className="text-muted small mb-4">
        <strong>Last updated:</strong> April 17, 2025
      </p>

      <p className="lead text-secondary mb-4">
        Welcome to {COMPANY_NAME}. Please read these Terms of Service (&ldquo;Terms&rdquo;)
        carefully before using our network. By using our apps or service, you agree to follow these
        rules.
      </p>

      <hr className="my-4 opacity-25" />

      <h2 className="h4 fw-bold text-body mt-4 mb-3">1. Acceptance of Terms</h2>
      <p className="text-secondary lh-lg">
        By signing up, logging in, or using {COMPANY_NAME}, you confirm that you have read,
        understood, and agree to follow these rules alongside our{' '}
        <Link to="/privacy-policy" className="text-decoration-none fw-medium text-primary">
          Privacy Policy
        </Link>
        .
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">2. Changes to These Rules</h2>
      <p className="text-secondary lh-lg">
        We might update these terms occasionally. If we make big changes, we will let you know by
        posting an update on our website or sending you an email. If you keep using our service
        after changes are live, it means you agree to the updated rules.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">3. Our Service</h2>
      <p className="text-secondary lh-lg">
        {COMPANY_NAME} provides encrypted private connections that allow you to browse the internet
        safely, away from prying eyes.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">4. Your Account</h2>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">
          To use our network, you must create an account using correct and active info.
        </li>
        <li className="mb-2">
          You are entirely responsible for keeping your password safe and for everything that
          happens under your profile.
        </li>
        <li className="mb-2">
          You cannot share your account details or let others use your active connection.
        </li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">5. Billing and Refunds</h2>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">Using {COMPANY_NAME} requires an active subscription plan.</li>
        <li className="mb-2">
          All payments are safely handled by our external payment provider. All sales are final and
          non-refundable unless required by local laws.
        </li>
        <li className="mb-2">
          We reserve the right to adjust our subscription rates at any time. Any price changes will
          only apply to your future billing periods.
        </li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">6. Rules of Use</h2>
      <p className="text-secondary mb-3">
        You agree not to use {COMPANY_NAME} for illegal, harmful, or abusive actions, including:
      </p>
      <ul className="text-secondary lh-lg">
        <li className="mb-2">Spreading malware, viruses, phishing links, or spam.</li>
        <li className="mb-2">Hacking, trying to breach other networks, or stealing data.</li>
        <li className="mb-2">
          Violating intellectual property rights or downloading pirated material.
        </li>
        <li className="mb-2">Any actions that break local or international laws.</li>
      </ul>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">7. Privacy Commitments</h2>
      <p className="text-secondary lh-lg">
        Your privacy is our focus. We maintain a strict no-logs policy, meaning we do not track your
        browsing history or lookup requests. Read our{' '}
        <Link to="/privacy-policy" className="text-decoration-none fw-medium text-primary">
          Privacy Policy
        </Link>{' '}
        for full details.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">8. Company Property</h2>
      <p className="text-secondary lh-lg">
        All copy, designs, logos, apps, and software related to {COMPANY_NAME} belong entirely to us
        or our partners, and are protected by copyright laws.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">9. Service Warranty</h2>
      <p className="text-secondary lh-lg">
        We provide our service &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without any formal
        guarantees. While we work hard to keep everything running perfectly, we cannot promise our
        network will never experience drops or errors.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">10. Liability Limits</h2>
      <p className="text-secondary lh-lg">
        As far as permitted by law, {COMPANY_NAME} and its team will not be responsible for any
        indirect or incidental damages that come from your use or inability to use our network.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">11. Closing Accounts</h2>
      <p className="text-secondary lh-lg">
        We reserve the right to close or suspend your access to {COMPANY_NAME} immediately if you
        break these rules or use our network for illegal activities.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">12. Legal Jurisdiction</h2>
      <p className="text-secondary lh-lg">
        These rules are governed by the laws of the region where {COMPANY_NAME} is legally
        established, without causing conflicts with other regional legal frameworks.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">13. Invalid Provisions</h2>
      <p className="text-secondary lh-lg">
        If a specific clause in these rules turns out to be legally unenforceable, that single rule
        will be dropped, but the rest of this document will remain in full force.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">14. Final Agreement</h2>
      <p className="text-secondary lh-lg">
        This document serves as the complete and final agreement between you and {COMPANY_NAME}{' '}
        regarding our services, replacing any older versions or conversations.
      </p>

      <h2 className="h4 fw-bold text-body mt-4 mb-3">15. Contact Us</h2>
      <p className="text-secondary lh-lg">
        If you have any questions or need clarification on these terms, reach out anytime at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-decoration-none fw-medium text-primary">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </Container>
  );
};

export default TermsOfService;
