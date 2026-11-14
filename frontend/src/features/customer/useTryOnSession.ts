import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, isUncertainMutation } from '../../api/client';
import { isTryOnPending, tryOnApi, type TryOnJob } from '../../api/try-on';

export function useTryOnSession(owner: string | undefined, productId: string, variantId: string) {
  const cache = useQueryClient();
  const prefix = ['try-on', owner, productId, variantId];
  const storageKey = `pbl6_try_on_pending_${owner}_${productId}_${variantId}`;
  const [pendingKey, setPendingKey] = useState<string | null>(() => {
    try { return sessionStorage.getItem(storageKey); } catch { return null; }
  });
  const [tracked, setTracked] = useState<TryOnJob>();
  const [freshDraft, setFreshDraft] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'submitting' | 'deleting'>('idle');
  const [error, setError] = useState<string>();
  const [passwordError, setPasswordError] = useState(false);
  const flight = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const alive = useRef(true);

  const capabilities = useQuery({
    queryKey: [...prefix, 'capabilities'], enabled: !!owner && !!variantId,
    queryFn: ({ signal }) => tryOnApi.capabilities(productId, variantId, signal), retry: false,
  });
  const jobs = useQuery({
    queryKey: [...prefix, 'jobs'], enabled: !!owner && capabilities.isSuccess,
    queryFn: ({ signal }) => tryOnApi.jobs(productId, variantId, signal), retry: false,
    refetchInterval: pendingKey ? 4000 : false,
  });
  const recovered = jobs.data?.find(item => pendingKey ? item.idempotency_key === pendingKey : isTryOnPending(item))
    ?? (!pendingKey && !freshDraft ? jobs.data?.[0] : undefined);
  const selected = tracked ?? recovered;
  const detail = useQuery({
    queryKey: [...prefix, 'job', selected?.id], enabled: !!owner && !!selected?.id,
    queryFn: ({ signal }) => tryOnApi.job(selected!.id, productId, variantId, signal), retry: false,
    refetchInterval: query => ['QUEUED', 'PROCESSING'].includes(query.state.data?.status ?? selected?.status ?? '') ? 3000 : false,
  });
  const job = detail.data ?? selected;

  function remember(value: string | null) {
    setPendingKey(value);
    try { if (value) sessionStorage.setItem(storageKey, value); else sessionStorage.removeItem(storageKey); } catch { /* No photos or credentials are stored. */ }
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
      // Signed image URLs and quota are private to this mounted session.
      cache.removeQueries({ queryKey: ['try-on', owner, productId, variantId] });
    };
  }, [cache, owner, productId, variantId]);

  useEffect(() => {
    if (pendingKey && job?.idempotency_key === pendingKey) {
      setTracked(job);
      remember(null);
    }
  }, [job?.id, job?.idempotency_key, pendingKey]);

  useEffect(() => {
    if (job && !isTryOnPending(job)) void capabilities.refetch();
  }, [job?.id, job?.status]);

  const blocked = !!pendingKey || isTryOnPending(job) || phase !== 'idle';

  async function generate(file: File, demoPassword?: string) {
    const caps = capabilities.data;
    if (!owner || !caps?.enabled || caps.quota.remaining < 1 || blocked || flight.current || !jobs.isSuccess || (caps.demo_password_required && !demoPassword)) return;
    flight.current = true;
    controller.current = new AbortController();
    setError(undefined);
    setPasswordError(false);
    setPhase('uploading');
    let submitted = false;
    try {
      const photo = await tryOnApi.upload(file, controller.current.signal, demoPassword);
      if (!alive.current) return;
      const key = crypto.randomUUID();
      remember(key);
      setPhase('submitting');
      submitted = true;
      const created = await tryOnApi.create({ photo_id: photo.id, product_id: productId, variant_id: variantId, consent_version: caps.consent_version }, key, controller.current.signal, demoPassword);
      if (!created.id || created.product_id !== productId || created.variant_id !== variantId) throw new Error('Invalid job acknowledgement');
      if (!alive.current) return;
      setTracked(created);
      setFreshDraft(false);
      remember(null);
    } catch (value) {
      if (!alive.current) return;
      if (submitted && isUncertainMutation(value)) {
        setError('Chưa xác định yêu cầu đã được nhận hay chưa. Hãy kiểm tra kết quả trước khi tạo lại.');
      } else {
        remember(null);
        setPasswordError(value instanceof ApiError && value.code.startsWith('DEMO_PASSWORD_'));
        setError(value instanceof ApiError ? value.message : 'Không gửi được ảnh. Vui lòng thử lại.');
      }
    } finally {
      flight.current = false;
      if (alive.current) {
        setPhase('idle');
        void capabilities.refetch();
        void jobs.refetch();
      }
    }
  }

  function newPhoto() {
    if (blocked) return;
    setTracked(undefined);
    setFreshDraft(true);
    setError(undefined);
    setPasswordError(false);
  }

  async function removeResult() {
    if (!job || blocked || flight.current) return;
    flight.current = true;
    setPhase('deleting');
    setError(undefined);
    try {
      await tryOnApi.remove(job.id);
      if (!alive.current) return;
      setTracked(undefined);
      setFreshDraft(true);
      cache.removeQueries({ queryKey: [...prefix, 'job'] });
      await jobs.refetch();
    } catch { if (alive.current) setError('Chưa xác nhận ảnh đã được xóa. Hãy kiểm tra lại.'); }
    finally { flight.current = false; if (alive.current) setPhase('idle'); }
  }

  return { capabilities, jobs, job, phase, error, passwordError, blocked, uncertain: !!pendingKey, generate, newPhoto, removeResult,
    checking: jobs.isFetching || detail.isFetching,
    check: () => { void capabilities.refetch(); void jobs.refetch(); if (selected?.id) void detail.refetch(); },
    readError: detail.error ?? jobs.error,
  };
}
