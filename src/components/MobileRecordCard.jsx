import { Link } from 'react-router-dom';

export const MobileRecordCard = ({ title, titleHref, subtitle, items = [], actions }) => (
  <div className="p-3">
    <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
      <div className="min-w-0">
        {titleHref ? (
          <Link to={titleHref} className="d-block fw-bold text-body text-break">
            {title}
          </Link>
        ) : (
          <div className="fw-bold text-body text-break">{title}</div>
        )}
        {subtitle && <div className="small text-body-secondary text-break">{subtitle}</div>}
      </div>
    </div>

    {items.length > 0 && (
      <dl className="row g-2 mb-0 small">
        {items.map(({ label, value }) => (
          <div className="col-12 col-sm-4" key={label}>
            <dt className="text-body-secondary fw-semibold">{label}</dt>
            <dd className="mb-0 ms-sm-auto text-body text-break">{value}</dd>
          </div>
        ))}
      </dl>
    )}

    {actions && <div className="mt-3">{actions}</div>}
  </div>
);
