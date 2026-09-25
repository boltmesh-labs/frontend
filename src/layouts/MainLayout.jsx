import { useEffect, useRef, useState } from 'react';
import { Button, Col, Container, Nav, Navbar, Row } from 'react-bootstrap';
import { FaMoon, FaSignOutAlt, FaSun } from 'react-icons/fa';
import { FaFacebook, FaGithub, FaShieldHalved, FaXTwitter } from 'react-icons/fa6';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/context/AuthContext';
import { COMPANY_NAME } from '@/utils/config';
import { USER_ROLES } from '@/constants/roles';

const CURRENT_YEAR = new Date().getFullYear();
const isTheme = (value) => value === 'light' || value === 'dark';

const MainLayout = () => {
  const { accessToken, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasMountedRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAuthenticated = !!accessToken;
  const isAdmin = isAuthenticated && user?.role === USER_ROLES.admin;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [location.pathname]);

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (isTheme(savedTheme)) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Logout owns its post-logout destination instead of depending on whichever
  // route guard happens to wrap the current page bouncing the user implicitly.
  // Awaiting the server round-trip ensures the refresh cookie is actually
  // cleared before leaving; navigating early would let a failed logout pass
  // silently while AuthProvider's boot refresh restores the session on reload.
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-body-tertiary">
      <a href="#main-content" className="visually-hidden-focusable btn btn-primary">
        Skip to content
      </a>

      {/* Header / Navbar */}
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm py-2">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold">
            {COMPANY_NAME}
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbar-nav" />
          <Navbar.Collapse id="navbar-nav">
            <Nav className="ms-auto align-items-lg-center gap-2">
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                onClick={toggleTheme}
                className="d-inline-flex align-items-center justify-content-center p-2 rounded-circle me-lg-2 border-0 text-light opacity-75 opacity-100-hover"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <FaMoon size={16} />
                ) : (
                  <FaSun size={16} className="text-warning" />
                )}
              </Button>

              {isAuthenticated ? (
                <>
                  <Nav.Link as={Link} to="/dashboard">
                    Dashboard
                  </Nav.Link>

                  {isAdmin && (
                    <Nav.Link
                      as={Link}
                      to="/admin"
                      className="text-info d-inline-flex align-items-center gap-1"
                    >
                      <FaShieldHalved size={14} /> Admin Panel
                    </Nav.Link>
                  )}

                  <Button
                    type="button"
                    variant="outline-light"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="d-inline-flex align-items-center gap-2 ms-lg-2"
                  >
                    <FaSignOutAlt /> Logout
                  </Button>
                </>
              ) : (
                <Button
                  as={Link}
                  to="/login"
                  variant="primary"
                  size="sm"
                  className="px-4 text-white"
                >
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Main Content Body */}
      <main id="main-content" tabIndex="-1" className="flex-grow-1 py-4">
        <Container>
          <Outlet />
        </Container>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-4 border-top border-secondary mt-auto">
        <Container>
          <Row className="gy-3 align-items-center">
            <Col md={4} className="text-md-start small text-white-50">
              &copy; {CURRENT_YEAR} {COMPANY_NAME}. All rights reserved.
            </Col>

            <Col md={4} className="small d-flex justify-content-center gap-3">
              <NavLink to="/terms" className="text-light text-decoration-none opacity-75">
                Terms
              </NavLink>
              <NavLink to="/privacy-policy" className="text-light text-decoration-none opacity-75">
                Privacy
              </NavLink>
              <NavLink to="/contact" className="text-light text-decoration-none opacity-75">
                Contact
              </NavLink>
            </Col>

            <Col md={4} className="d-flex justify-content-center justify-content-md-end gap-3">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light opacity-75"
                aria-label="X (formerly Twitter)"
              >
                <FaXTwitter size={18} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light opacity-75"
                aria-label="GitHub"
              >
                <FaGithub size={18} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light opacity-75"
                aria-label="Facebook"
              >
                <FaFacebook size={18} />
              </a>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default MainLayout;
