import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCheck, CircleAlert, ImagePlus, LoaderCircle, LockKeyhole, RefreshCw, ShieldCheck, Shirt, ShoppingBag, Trash2, Upload, UserRound, X } from 'lucide-react';
import type { OperationOutputs } from '../../api/operations.generated';
import { ApiError } from '../../api/client';
import { useAuth } from '../../api/auth-context';
import { isTryOnPending, tryOnResultUrl } from '../../api/try-on';
import { useTryOnSession } from '../../features/customer/useTryOnSession';
import { variantLabel } from '../../features/customer/checkout-intent';
import { rememberAuthReturn } from '../../features/customer/auth/auth-return';
import { Modal } from '../Modal';
import { ProductImage } from '../ProductImage';
import { Button } from '../ui/Button';
import './virtual-try-on.css';

type Product = OperationOutputs['getProduct'];
type Variant = NonNullable<Product['variants']>[number];
interface Props {
  product: Product;
  selectedVariant?: Variant;
  onClose: () => void;
  onAddToCart?: () => void;
  canAddToCart?: boolean;
}

export function VirtualTryOnModal({ product, selectedVariant, onClose, onAddToCart, canAddToCart }: Props) {
  const { session } = useAuth();
  const owner = session?.context?.roles.includes('CUSTOMER') ? session.context.user_id : undefined;
  const flow = useTryOnSession(owner, product.id!, selectedVariant?.id ?? '');
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [decoding, setDecoding] = useState(false);
  const [consent, setConsent] = useState(false);
  const [demoPassword, setDemoPassword] = useState('');
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<'original' | 'result'>('original');
  const [resultFailed, setResultFailed] = useState(false);
  const [resultAttempt, setResultAttempt] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const photoVersion = useRef(0);
  const caps = flow.capabilities.data;
  const job = flow.job;
  const result = tryOnResultUrl(job);
  const waiting = isTryOnPending(job) || flow.uncertain;
  const image = product.images?.find(item => item.variant_id === selectedVariant?.id) ?? product.images?.find(item => !item.variant_id);
  const selection = variantLabel(selectedVariant?.variant_values);

  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { photoVersion.current++; }, []);
  useEffect(() => { if (job?.status === 'SUCCEEDED') setView('result'); setResultFailed(false); }, [job?.id, job?.status]);
  useEffect(() => {
    if (!job?.expires_at || !result) return;
    const timer = window.setTimeout(() => setClock(Date.now()), Math.max(0, Math.min(Date.parse(job.expires_at) - clock + 20, 2147483647)));
    return () => window.clearTimeout(timer);
  }, [job?.expires_at, result, clock]);

  async function choosePhoto(candidate?: File) {
    if (!candidate || flow.blocked) return;
    const version = ++photoVersion.current;
    setPhotoError(undefined);
    setDecoding(false);
    setFile(undefined);
    setConsent(false);
    setDemoPassword('');
    flow.newPhoto();
    setView('original');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.type)) { setPhotoError('Chọn ảnh JPG, PNG hoặc WebP.'); return; }
    if (candidate.size > 8 * 1024 * 1024) { setPhotoError('Ảnh vượt quá 8 MB. Hãy chọn ảnh nhỏ hơn.'); return; }
    setDecoding(true);
    try {
      const bitmap = await createImageBitmap(candidate);
      const { width, height } = bitmap;
      bitmap.close();
      if (width < 256 || height < 256 || width * height > 24000000) throw new Error('dimensions');
      if (photoVersion.current === version) setFile(candidate);
    } catch (error) {
      if (photoVersion.current === version) setPhotoError(error instanceof Error && error.message === 'dimensions'
        ? 'Chọn ảnh từ 256 px mỗi chiều và không quá 24 megapixel.' : 'Không đọc được ảnh này. Hãy chọn ảnh khác.');
    } finally { if (photoVersion.current === version) setDecoding(false); }
  }

  function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false);
    if (event.dataTransfer.files.length !== 1) { setPhotoError('Mỗi lần chọn một ảnh.'); return; }
    void choosePhoto(event.dataTransfer.files[0]);
  }

  const capsError = flow.capabilities.error;
  const noQuota = caps && caps.quota.remaining === 0;
  const canGenerate = !!file && !!image && !!caps?.enabled && !noQuota && consent && !flow.blocked && !decoding && flow.jobs.isSuccess && (!caps.demo_password_required || demoPassword.length > 0);
  function generate() {
    if (!file || !canGenerate) return;
    const password = demoPassword;
    setDemoPassword('');
    void flow.generate(file, password);
  }
  const statusMessage = !owner
    ? session ? 'Tính năng thử đồ dành cho tài khoản khách hàng.' : 'Đăng nhập để tạo và xem lại ảnh thử đồ của bạn.'
    : flow.capabilities.isPending ? 'Đang kiểm tra lượt thử…'
    : capsError ? capsError instanceof ApiError && capsError.status !== 0 ? capsError.message : 'Chưa kết nối được phòng thử đồ. Hãy kiểm tra lại.'
    : !caps?.enabled ? caps?.message ?? 'Tạo ảnh thử đồ đang tạm dừng.'
    : noQuota ? 'Bạn đã dùng hết lượt thử hôm nay.'
    : flow.readError ? 'Chưa tải được lần thử trước. Hãy kiểm tra lại trước khi tạo ảnh.' : undefined;
  const displayResult = view === 'result' && !!result;

  return <Modal labelledBy="try-on-title" onClose={onClose}>
    <section className="virtual-try-on">
      <header className="try-on-header">
        <div className="try-on-heading"><span className="try-on-mark"><Shirt size={21} aria-hidden="true" /></span><div><span className="try-on-eyebrow">GÓC PHỐI ĐỒ</span><h2 id="try-on-title">Phòng thử đồ</h2></div><span className="try-on-ai">AI</span></div>
        <button className="try-on-icon" onClick={onClose} aria-label="Đóng phòng thử đồ"><X size={21} /></button>
      </header>

      <div className="try-on-body">
        <div className="try-on-workspace">
          <div className="try-on-workspace-bar"><span>{displayResult ? 'ẢNH THỬ ĐỒ' : 'ẢNH CỦA BẠN'}</span>{job?.status === 'SUCCEEDED' && preview && result && <div className="try-on-switch" role="group" aria-label="Chế độ xem ảnh"><button aria-pressed={view === 'original'} onClick={() => setView('original')}>Ảnh gốc</button><button aria-pressed={view === 'result'} onClick={() => setView('result')}>Kết quả</button></div>}{!result && <span className="try-on-photo-count">01 / ẢNH</span>}</div>

          <div className={'try-on-canvas' + (dragging ? ' is-dragging' : '') + (preview || displayResult ? ' has-photo' : '')}
            onDragOver={event => { event.preventDefault(); if (!flow.blocked) setDragging(true); }}
            onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={drop}>
            {displayResult ? <img key={resultAttempt} className="try-on-person" src={result} alt={'Ảnh AI thử ' + product.title} onError={() => setResultFailed(true)} hidden={resultFailed} />
              : preview ? <img className="try-on-person" src={preview} alt="Ảnh cá nhân đã chọn" />
              : <div className="try-on-empty">
                <div className="try-on-photo-frame" aria-hidden="true"><span /><UserRound size={64} strokeWidth={1} /><i><ImagePlus size={19} /></i></div>
                <h3>Bắt đầu với ảnh của bạn</h3><p>Chọn ảnh rõ một người, thấy phần cần thử đồ.</p>
                <Button variant="secondary" className="try-on-upload" disabled={flow.blocked || decoding} onClick={() => input.current?.click()}><Upload size={16} />{decoding ? 'Đang đọc ảnh…' : 'Chọn ảnh'}</Button>
                <small>hoặc kéo ảnh vào đây · JPG, PNG, WebP · tối đa 8 MB</small>
              </div>}
            {displayResult && resultFailed && <div className="try-on-empty"><CircleAlert size={32} /><h3>Chưa tải được ảnh kết quả</h3><Button variant="secondary" onClick={() => { setResultAttempt(value => value + 1); setResultFailed(false); flow.check(); }}>Thử tải lại</Button></div>}
            {preview && !displayResult && !waiting && <div className="try-on-photo-tools"><button className="try-on-photo-action" disabled={flow.blocked || decoding} onClick={() => input.current?.click()}><RefreshCw size={15} />Đổi ảnh</button><button className="try-on-photo-action" disabled={flow.blocked} aria-label="Bỏ ảnh đã chọn" onClick={() => { photoVersion.current++; setFile(undefined); setConsent(false); setPhotoError(undefined); flow.newPhoto(); }}><Trash2 size={16} /></button></div>}
            {(waiting || flow.phase === 'uploading' || flow.phase === 'submitting') && <div className="try-on-processing" role="status"><LoaderCircle size={27} className="try-on-spinner" /><strong>{flow.uncertain || job?.status === 'UNKNOWN' ? 'Đang kiểm tra yêu cầu' : flow.phase === 'uploading' ? 'Đang gửi ảnh' : job?.status === 'QUEUED' ? 'Ảnh của bạn đang chờ xử lý' : 'Đang phối đồ cho bạn'}</strong><p>{flow.uncertain || job?.status === 'UNKNOWN' ? 'Chưa rõ kết quả. Đừng gửi lại yêu cầu.' : 'Bạn có thể đóng cửa sổ và quay lại xem sau.'}</p></div>}
          </div>
          <input ref={input} hidden tabIndex={-1} className="try-on-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh cá nhân" onChange={(event: ChangeEvent<HTMLInputElement>) => { void choosePhoto(event.target.files?.[0]); event.target.value = ''; }} />
          {photoError && <p className="try-on-error" role="alert"><CircleAlert size={16} />{photoError}</p>}
          <p className="try-on-caption"><ShieldCheck size={15} />Ảnh AI để tham khảo, không xác nhận vừa kích cỡ.</p>
        </div>

        <aside className="try-on-sidebar" aria-label="Sản phẩm và lượt thử">
          <div className="try-on-section-label"><span>01</span><h3>Món đồ đang thử</h3></div>
          <div className="try-on-product-photo"><ProductImage src={image?.image_url} alt={product.title} name={product.title} /><span><Shirt size={13} />Đã chọn</span></div>
          <div className="try-on-product-info"><h3>{product.title}</h3><p>{selection || selectedVariant?.sku}</p>{selectedVariant && <strong>{selectedVariant.price_vnd.toLocaleString('vi-VN')} ₫</strong>}</div>
          {!image && <p className="try-on-error">Chưa có ảnh phù hợp với phân loại này.</p>}
          <div className="try-on-divider" />
          <div className="try-on-section-label"><span>02</span><h3>Một bức ảnh rõ nét</h3></div>
          <ul className="try-on-tips"><li><Check size={14} />Chỉ có bạn trong khung hình</li><li><Check size={14} />Thấy rõ phần cơ thể cần thử đồ</li><li><Check size={14} />Đủ sáng, không bị che khuất</li></ul>
          <div className={'try-on-quota' + (noQuota ? ' is-empty' : '')} aria-live="polite"><div><span>Lượt thử hôm nay</span>{owner && caps ? <strong>{caps.quota.remaining}<small> / {caps.quota.limit}</small></strong> : <LockKeyhole size={17} />}</div><p>{!owner ? 'Đăng nhập để xem lượt còn lại' : caps ? <>Làm mới lúc {new Date(caps.quota.reset_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</> : 'Chưa có thông tin hạn mức'}</p></div>
          {job?.status === 'SUCCEEDED' && <button className="try-on-text-button" disabled={flow.blocked} onClick={() => void flow.removeResult()}><Trash2 size={14} />{flow.phase === 'deleting' ? 'Đang xóa…' : 'Xóa ảnh kết quả'}</button>}
        </aside>
      </div>

      <footer className="try-on-footer">
        {statusMessage && <div className="try-on-notice" role="status"><CircleAlert size={17} /><span>{statusMessage}</span>{owner && !flow.capabilities.isPending && <button disabled={flow.capabilities.isFetching || flow.checking} onClick={flow.check}>Kiểm tra lại</button>}</div>}
        {flow.error && <p id="try-on-submit-error" className="try-on-error" role="alert"><CircleAlert size={16} />{flow.error}</p>}
        {job?.status === 'FAILED' && <p className="try-on-error" role="alert">{job.message ?? 'Chưa tạo được ảnh thử đồ. Hãy chọn ảnh rõ hơn và kiểm tra lượt còn lại.'}</p>}
        {job?.status === 'SUCCEEDED' && !result && <p className="try-on-notice">Ảnh kết quả đã hết hạn hoặc chưa sẵn sàng để xem.</p>}
        {owner && caps?.enabled && caps.demo_password_required && !waiting && !noQuota && <div className="try-on-demo-access">
          <div><label htmlFor="try-on-demo-password"><LockKeyhole size={14} aria-hidden="true" />Mật khẩu demo</label><small id="try-on-demo-help">Nhập lại mỗi lần tạo ảnh.</small></div>
          <input id="try-on-demo-password" name="try-on-demo-password" type="password" autoComplete="off" maxLength={128} value={demoPassword}
            disabled={flow.blocked} aria-invalid={flow.passwordError || undefined} aria-describedby={'try-on-demo-help' + (flow.passwordError ? ' try-on-submit-error' : '')}
            onChange={event => setDemoPassword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); generate(); } }} />
        </div>}
        {owner && caps?.enabled && !waiting && <label className="try-on-consent"><input type="checkbox" checked={consent} disabled={flow.blocked} onChange={event => setConsent(event.target.checked)} /><span>Tôi đồng ý gửi ảnh tới {caps.privacy.provider_label} để tạo ảnh thử đồ. Ảnh trên sàn được lưu tối đa {caps.privacy.retention_hours} giờ.</span></label>}
        <div className="try-on-footer-actions"><div className="try-on-footer-note"><LockKeyhole size={15} /><span>{file ? 'Ảnh chỉ được gửi khi bạn bấm tạo.' : 'Chọn ảnh để xem trước.'}</span></div><div className="try-on-buttons">
          {waiting ? <Button variant="secondary" disabled={flow.checking} onClick={flow.check}><RefreshCw size={16} />{flow.checking ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}</Button>
            : !session ? <Link className="ui-button ui-button-primary" to="/login" onClick={() => rememberAuthReturn('/products/' + product.id + '?variant=' + selectedVariant?.id)}>Đăng nhập để thử<ArrowRight size={16} /></Link>
            : result && onAddToCart ? <><Button variant="secondary" disabled={!canGenerate} onClick={generate}><RefreshCw size={16} />Tạo ảnh khác · 1 lượt</Button><Button disabled={!canAddToCart} onClick={onAddToCart}><ShoppingBag size={16} />Thêm vào giỏ</Button></>
            : <Button disabled={!canGenerate} loading={flow.phase === 'uploading' || flow.phase === 'submitting'} onClick={generate}><CheckCheck size={17} />Tạo ảnh thử đồ<span className="try-on-cost">1 lượt</span></Button>}
        </div></div>
      </footer>
    </section>
  </Modal>;
}

export default VirtualTryOnModal;
