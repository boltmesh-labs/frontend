import { useEffect } from 'react';
import { Pagination } from 'react-bootstrap';

export const DefaultPagination = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
  onPageChange,
  loading = false,
}) => {
  // A refetch can reduce the result set while the user is on a later page.
  // Clamp instead of leaving an empty, unrecoverable table with no controls.
  useEffect(() => {
    if (currentPage > Math.max(totalPages, 1)) onPageChange(Math.max(totalPages, 1));
  }, [currentPage, totalPages, onPageChange]);

  if (totalPages <= 1 && currentPage === 1) return null;

  const startCount = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endCount = Math.min(currentPage * pageSize, totalCount);

  const renderPaginationItems = () => {
    const items = [];
    for (let number = 1; number <= totalPages; number++) {
      if (
        number === 1 ||
        number === totalPages ||
        (number >= currentPage - 1 && number <= currentPage + 1)
      ) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            disabled={loading}
            onClick={() => onPageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      } else if (number === currentPage - 2 || number === currentPage + 2) {
        items.push(<Pagination.Ellipsis key={`ellipsis-${number}`} disabled />);
      }
    }
    return items;
  };

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4 px-1">
      <span className="text-muted small text-center text-sm-start">
        Showing {startCount}–{endCount} of {totalCount}
      </span>
      <Pagination className="shadow-sm rounded-3 m-0 flex-wrap justify-content-center">
        <Pagination.Prev
          disabled={currentPage === 1 || loading}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        />
        {renderPaginationItems()}
        <Pagination.Next
          disabled={currentPage === totalPages || loading}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        />
      </Pagination>
    </div>
  );
};
