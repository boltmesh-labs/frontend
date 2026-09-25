import { Card, Row, Col, Form, Button } from 'react-bootstrap';

export const TableFiltersBar = ({
  searchInput,
  onSearchChange,
  searchPlaceholder = '🔍 Search...',
  filters = [], // Array of { value, onChange, options, ariaLabel }
  onClear,
  isClearDisabled,
}) => {
  // Calculate dynamic column spans based on filter count
  const filterCount = filters.length;

  let searchColWidth;

  if (filterCount === 0) {
    searchColWidth = 10;
  } else if (filterCount === 1) {
    searchColWidth = 8;
  } else if (filterCount === 2) {
    searchColWidth = 6;
  } else if (filterCount === 3) {
    searchColWidth = 4;
  } else {
    searchColWidth = 2;
  }

  return (
    <Card className="p-3 mb-4 border-0 bg-body-tertiary rounded-3">
      <Row className="g-2">
        <Col md={searchColWidth}>
          <Form.Control
            type="search"
            aria-label="Search table"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Col>

        {filters.map((filter, idx) => (
          // ariaLabel is the stable per-filter identity; position is only a
          // last-resort fallback (mirrors DataTable's column-key strategy).
          <Col md={2} key={filter.ariaLabel ?? `filter-${idx}`}>
            <Form.Select
              aria-label={filter.ariaLabel}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Col>
        ))}

        <Col md={2}>
          <Button
            variant="outline-secondary"
            className="w-100 fw-bold rounded-3"
            onClick={onClear}
            disabled={isClearDisabled}
          >
            Clear
          </Button>
        </Col>
      </Row>
    </Card>
  );
};
