import { Button } from "../ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <Button type="button" variant="outline" onClick={handlePrev} disabled={page <= 1}>
        Poprzednia
      </Button>
      <span className="text-sm text-neutral-600">
        Strona {page} z {totalPages}
      </span>
      <Button type="button" variant="outline" onClick={handleNext} disabled={page >= totalPages}>
        Nastepna
      </Button>
    </div>
  );
}
