import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Container, Form } from 'react-bootstrap';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSendContactMessage } from '../hooks/useSupport';
import { AsyncButton } from '@/components/AsyncButton';
import { COMPANY_NAME } from '@/utils/config';
import { getApiError } from '@/utils/errorHandler';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Pending state comes straight from the mutation (no parallel useState flag).
  const sendMutation = useSendContactMessage();
  const isSubmitting = sendMutation.isPending;

  const abortControllerRef = useRef(null);

  // Meta tag lifecycle management
  usePageTitle(`Contact Support | ${COMPANY_NAME}`, `Support for ${COMPANY_NAME}.`);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      return 'Please fill out all required fields.';
    }
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccess(null);

    abortControllerRef.current = new AbortController();

    try {
      await sendMutation.mutateAsync({
        formData,
        signal: abortControllerRef.current.signal,
      });

      setSuccess("Your message has been sent successfully! We'll get back to you shortly.");
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      if (err.name !== 'CanceledError') {
        // getApiError also collapses FastAPI validation arrays to a string so a
        // raw object can never end up rendered as a React child.
        setError(getApiError(err, 'Failed to send your message. Please try again later.'));
      }
    }
  };

  return (
    <Container
      className="d-flex align-items-center justify-content-center py-5"
      style={{ minHeight: '75vh' }}
    >
      <Card className="p-4 shadow-sm border-0 w-100 rounded-3" style={{ maxWidth: '580px' }}>
        <Card.Body>
          <div className="text-center mb-4">
            <h1 className="fw-bold text-body mb-1 h2">Contact Support</h1>
            <p className="text-muted small">Need help? Send us a message below.</p>
          </div>

          {error && (
            <Alert variant="danger" className="small rounded-3">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="small rounded-3">
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="contact-name" className="fw-bold small">
                Name
              </Form.Label>
              <Form.Control
                id="contact-name"
                type="text"
                name="name"
                placeholder="Your Name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="contact-email" className="fw-bold small">
                Email
              </Form.Label>
              <Form.Control
                id="contact-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="contact-subject" className="fw-bold small">
                Subject
              </Form.Label>
              <Form.Control
                id="contact-subject"
                type="text"
                name="subject"
                placeholder="General Inquiry"
                value={formData.subject}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label htmlFor="contact-message" className="fw-bold small">
                Message
              </Form.Label>
              <Form.Control
                id="contact-message"
                as="textarea"
                rows={4}
                name="message"
                placeholder="How can we help?"
                value={formData.message}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </Form.Group>

            <div className="d-grid">
              <AsyncButton
                type="submit"
                variant="primary"
                className="py-2 fw-bold shadow-sm"
                loading={isSubmitting}
                loadingLabel="Sending..."
              >
                Send Message
              </AsyncButton>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Contact;
