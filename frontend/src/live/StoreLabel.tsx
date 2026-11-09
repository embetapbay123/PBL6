import { Button as UiButton } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { callOperation } from '../api/operations';
import { useRef } from 'react';

export function StoreLabel({
  id,
  prefix = '',
  className = 'cart-store-label',
  iconSize = 18,
}: {
  id: string;
  prefix?: string;
  className?: string;
  iconSize?: number;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const query = useQuery({
    queryKey: ['public-store', id],
    queryFn: () => callOperation('getPublicStore', { path: { id } }),
    retry: false,
  });
  const failed = query.isError || (!query.isPending && !query.data?.name?.trim());

  return (
    <>
      <Link ref={link} className={className} to={'/stores/' + id} aria-busy={query.isFetching}>
        <Store size={iconSize} className="shrink-0 text-slate-500" />
        {prefix}
        {failed ? 'Chưa đọc được tên gian hàng' : query.data?.name ?? 'Đang tải gian hàng…'}
      </Link>
      {failed && (
        <UiButton
          type="button"
          variant="secondary"
          aria-label="Đọc lại tên gian hàng"
          disabled={query.isFetching}
          onClick={async (event) => {
            const trigger = event.currentTarget;
            const result = await query.refetch();
            if (
              !result.error &&
              (document.activeElement === trigger ||
                (document.activeElement === document.body && !trigger.isConnected))
            ) {
              link.current?.focus();
            }
          }}
        >
          Thử lại tên gian hàng
        </UiButton>
      )}
    </>
  );
}
