import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Store,
  Package,
  Boxes,
  ClipboardList,
  Users,
  Ticket,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Shield,
  Clock,
  Banknote,
  DollarSign
} from 'lucide-react';
import { OrderStatus, ProductSaleStatus } from '../../types';

export const SellerPortal: React.FC = () => {
  const {
    currentUser,
    stores,
    products,
    updateProductSaleStatus,
    orders,
    updateOrderStatus,
    collectCodPayment,
    staffMembers,
    staffInvitations,
    inviteStaff,
    revokeStaffInvitation,
    toggleStaffLock,
    stockMovements,
    adjustInventory,
    vouchers
  } = useApp();

  const isOwner = currentUser.activeRole === 'STORE_OWNER';
  const targetStoreId = currentUser.storeId || 'store-1';
  const store = stores.find(s => s.id === targetStoreId) || stores[0];

  // Active tab in portal
  const [activeTab, setActiveTab] = useState<'products' | 'inventory' | 'orders' | 'staff' | 'reports'>('products');

  // Inventory adjustment modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(10);
  const [adjustReason, setAdjustReason] = useState('Nhập hàng bổ sung từ nhà phân phối');

  // Staff invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [permProduct, setPermProduct] = useState(true);
  const [permInventory, setPermInventory] = useState(true);
  const [permOrder, setPermOrder] = useState(true);
  const [permCod, setPermCod] = useState(true);

  // Store data filters
  const storeProducts = products.filter(p => p.storeId === store.id);
  const storeOrders = orders.filter(o => o.storeId === store.id);
  const storeStaff = staffMembers.filter(s => s.storeId === store.id);
  const storeInvites = staffInvitations.filter(i => i.storeId === store.id);
  const storeVouchers = vouchers.filter(v => v.scope === 'STORE' && v.storeId === store.id);

  // Financial calculations for reports
  const grossSales = storeOrders
    .filter(o => o.orderStatus !== 'CANCELLED')
    .reduce((acc, o) => acc + o.subtotalVnd, 0);
  const collectedPayments = storeOrders
    .filter(o => o.paymentStatus === 'SUCCESS')
    .reduce((acc, o) => acc + o.payableVnd, 0);
  const totalCompletedOrders = storeOrders.filter(o => o.orderStatus === 'COMPLETED').length;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) return;
    adjustInventory(selectedVariantId, adjustAmount, adjustReason);
    alert('Đã cập nhật tồn kho và ghi nhật ký StockMovement!');
    setAdjustModalOpen(false);
  };

  const handleInviteStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteStaff(inviteEmail.trim(), {
      canManageProduct: permProduct,
      canManageInventory: permInventory,
      canManageOrder: permOrder,
      canCollectCod: permCod
    });
    alert(`Đã gửi lời mời đến ${inviteEmail}! Bạn có thể mở Mock Mailbox để kiểm tra email mời.`);
    setInviteEmail('');
    setInviteModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Store Banner & Context Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={store.logo}
            alt={store.name}
            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{store.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {store.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">{store.description}</p>
            <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
              <span>Đánh giá: <strong>{store.ratingAvg} ★</strong></span>
              <span>•</span>
              <span>Đang đăng nhập vai trò: <strong className="text-emerald-700">{currentUser.activeRole} ({currentUser.fullName})</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>S01. Quản lý Sản phẩm ({storeProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>S02. Quản lý Kho & Tồn ({stockMovements.length} logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>S03. Đơn hàng Gian hàng ({storeOrders.length})</span>
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'staff'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>S04. Nhân viên & Lời mời (Owner)</span>
          </button>
        )}

        {isOwner && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>S05. Voucher & Báo cáo (Owner)</span>
          </button>
        )}
      </div>

      {/* TAB 1: S01 Products */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Danh mục sản phẩm của Store</h3>
              <p className="text-xs text-slate-500">
                Quản lý trạng thái DRAFT / PUBLISHED / STOPPED và hiển thị cảnh báo nếu bị Admin ẩn
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">Ngành hàng</th>
                  <th className="p-3">Biến thể / SKU</th>
                  <th className="p-3">Trạng thái bán</th>
                  <th className="p-3">Kiểm duyệt Admin</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50/50">
                    <td className="p-3 flex items-center gap-3">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-bold text-slate-900">{prod.name}</p>
                        <p className="text-[11px] text-slate-500">Đã bán: {prod.salesCount}</p>
                      </div>
                    </td>

                    <td className="p-3 text-slate-700">{prod.categoryName}</td>

                    <td className="p-3 space-y-1">
                      {prod.variants.map(v => (
                        <div key={v.id} className="text-[11px] text-slate-600">
                          <code className="text-slate-800 font-bold">{v.sku}</code>: {v.title} ({formatVnd(v.priceVnd)})
                        </div>
                      ))}
                    </td>

                    <td className="p-3">
                      <select
                        value={prod.saleStatus}
                        onChange={e => updateProductSaleStatus(prod.id, e.target.value as ProductSaleStatus)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                          prod.saleStatus === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : prod.saleStatus === 'DRAFT'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="DRAFT">DRAFT (Bản nháp)</option>
                        <option value="PUBLISHED">PUBLISHED (Đang bán)</option>
                        <option value="STOPPED">STOPPED (Tạm ngừng bán)</option>
                      </select>
                    </td>

                    <td className="p-3">
                      {prod.isAdminHidden ? (
                        <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-bold text-[11px] block">
                          Bị Admin ẩn: {prod.adminHiddenReason || 'Vi phạm chính sách'}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          Bình thường
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          const nextStatus: ProductSaleStatus =
                            prod.saleStatus === 'PUBLISHED' ? 'STOPPED' : 'PUBLISHED';
                          updateProductSaleStatus(prod.id, nextStatus);
                        }}
                        className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 font-semibold text-[11px]"
                      >
                        {prod.saleStatus === 'PUBLISHED' ? 'Ngừng bán' : 'Bật bán'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: S02 Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Quản lý Kho & Tồn kho Biến thể</h3>
                <p className="text-xs text-slate-500">
                  Xem Quantity, Reserved và Available; điều chỉnh có lý do bắt buộc để ghi log StockMovement
                </p>
              </div>

              <button
                onClick={() => {
                  const firstVar = storeProducts[0]?.variants[0]?.id || '';
                  setSelectedVariantId(firstVar);
                  setAdjustModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Điều chỉnh Tồn kho</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3">Biến thể</th>
                    <th className="p-3">Tổng tồn (Quantity)</th>
                    <th className="p-3">Đang giữ chờ thanh toán (Reserved)</th>
                    <th className="p-3">Khả dụng (Available)</th>
                    <th className="p-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeProducts.flatMap(p =>
                    p.variants.map(v => {
                      const available = v.quantity - v.reservedQuantity;
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">{v.sku}</td>
                          <td className="p-3 font-medium text-slate-800">{p.name}</td>
                          <td className="p-3 text-slate-600">{v.title}</td>
                          <td className="p-3 font-bold text-slate-900">{v.quantity}</td>
                          <td className="p-3 font-bold text-amber-600">{v.reservedQuantity}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                available > 5
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : available > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {available} cái
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedVariantId(v.id);
                                setAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px]"
                            >
                              Điều chỉnh
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock movements audit trail */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-900">Nhật ký biến động kho (StockMovement Audit)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-2.5">Thời gian</th>
                    <th className="p-2.5">SKU / Sản phẩm</th>
                    <th className="p-2.5">Loại biến động</th>
                    <th className="p-2.5">Thay đổi</th>
                    <th className="p-2.5">Tồn mới</th>
                    <th className="p-2.5">Lý do</th>
                    <th className="p-2.5">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockMovements.map(mov => (
                    <tr key={mov.id}>
                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                        {new Date(mov.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {mov.sku} ({mov.productName})
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                          {mov.type}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600">
                        {mov.changeAmount > 0 ? `+${mov.changeAmount}` : mov.changeAmount}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">{mov.newQuantity}</td>
                      <td className="p-2.5 text-slate-600">{mov.reason}</td>
                      <td className="p-2.5 text-slate-700">{mov.operatorName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: S03 Store Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Quản lý Đơn hàng của Gian hàng</h3>
            <p className="text-xs text-slate-500">
              Vận hành trạng thái: CONFIRMED → PROCESSING → SHIPPED → COMPLETED; Thu tiền COD khi giao thành công
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-y border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Mã đơn</th>
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">PT Thanh toán</th>
                  <th className="p-3">Trạng thái đơn</th>
                  <th className="p-3">Tiền cần thu</th>
                  <th className="p-3 text-right">Vận hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Chưa có đơn hàng nào cho gian hàng này.
                    </td>
                  </tr>
                ) : (
                  storeOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        #{order.id}
                        <span className="block text-[10px] text-slate-400">{order.purchaseGroupId}</span>
                      </td>

                      <td className="p-3">
                        <p className="font-bold text-slate-800">{order.customerName}</p>
                        <p className="text-[11px] text-slate-500">{order.customerPhone}</p>
                      </td>

                      <td className="p-3 text-[11px] space-y-0.5">
                        {order.items.map(it => (
                          <div key={it.id}>
                            {it.productName} ({it.variantTitle}) × {it.quantity}
                          </div>
                        ))}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.paymentMethod === 'COD'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.paymentMethod}: {order.paymentStatus}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-emerald-600">
                        {formatVnd(order.payableVnd)}
                      </td>

                      <td className="p-3 text-right space-x-1.5">
                        {order.orderStatus === 'PENDING' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px]"
                          >
                            Xác nhận đơn
                          </button>
                        )}
                        {order.orderStatus === 'CONFIRMED' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'PROCESSING')}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-[11px]"
                          >
                            Chuẩn bị hàng
                          </button>
                        )}
                        {order.orderStatus === 'PROCESSING' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'SHIPPED')}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[11px]"
                          >
                            Giao cho Shipper
                          </button>
                        )}
                        {order.orderStatus === 'SHIPPED' && order.paymentMethod === 'COD' && (
                          <button
                            onClick={() => collectCodPayment(order.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                          >
                            Thu tiền COD & Hoàn tất
                          </button>
                        )}
                        {order.orderStatus === 'SHIPPED' && order.paymentMethod === 'SANDBOX' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                          >
                            Hoàn tất giao hàng
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: S04 Staff Management (Owner only) */}
      {activeTab === 'staff' && isOwner && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Quản lý Đội ngũ Nhân viên Store</h3>
              <p className="text-xs text-slate-500">
                Chủ Store (Owner) mời Seller, phân bổ 4 nhóm quyền và quản lý khóa/mở quyền
              </p>
            </div>

            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Mời nhân viên mới</span>
            </button>
          </div>

          {/* Current Staff List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Nhân sự hiện tại ({storeStaff.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeStaff.map(staff => (
                <div key={staff.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900">{staff.fullName}</h5>
                      <p className="text-slate-500 text-[11px] font-mono">{staff.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-200 text-slate-800">
                      {staff.role}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[11px] grid grid-cols-2 gap-1 text-slate-600">
                    <span>{staff.permissions.canManageProduct ? '✓' : '✗'} Sản phẩm</span>
                    <span>{staff.permissions.canManageInventory ? '✓' : '✗'} Tồn kho</span>
                    <span>{staff.permissions.canManageOrder ? '✓' : '✗'} Đơn hàng</span>
                    <span>{staff.permissions.canCollectCod ? '✓' : '✗'} Thu COD</span>
                  </div>

                  {staff.role !== 'STORE_OWNER' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => toggleStaffLock(staff.id)}
                        className={`px-3 py-1 rounded text-[11px] font-bold transition ${
                          staff.isLocked
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {staff.isLocked ? 'Mở khóa nhân viên' : 'Khóa quyền nhân viên'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invitations List */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Lời mời đang xử lý ({storeInvites.length})
            </h4>
            {storeInvites.length === 0 ? (
              <p className="text-xs text-slate-400">Không có lời mời nào đang chờ.</p>
            ) : (
              <div className="space-y-2">
                {storeInvites.map(inv => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{inv.invitedEmail}</p>
                      <p className="text-[11px] text-slate-500">
                        Hết hạn: {new Date(inv.expiresAt).toLocaleDateString('vi-VN')} • Trạng thái: <strong>{inv.status}</strong>
                      </p>
                    </div>
                    {inv.status === 'PENDING' && (
                      <button
                        onClick={() => revokeStaffInvitation(inv.id)}
                        className="px-3 py-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-xs font-semibold"
                      >
                        Thu hồi lời mời
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: S05 Vouchers & Financial Reports (Owner only) */}
      {activeTab === 'reports' && isOwner && (
        <div className="space-y-6">
          {/* Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng doanh số hàng</span>
              <p className="text-2xl font-black text-slate-900">{formatVnd(grossSales)}</p>
              <p className="text-[11px] text-slate-400">Tính trên các đơn không hủy</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiền đã thu thành công</span>
              <p className="text-2xl font-black text-emerald-600">{formatVnd(collectedPayments)}</p>
              <p className="text-[11px] text-emerald-700">Sandbox đã trả & COD đã thu</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn hoàn tất thành công</span>
              <p className="text-2xl font-black text-blue-600">{totalCompletedOrders} Đơn</p>
              <p className="text-[11px] text-slate-400">Khách đã nhận hàng</p>
            </div>
          </div>

          {/* Store Vouchers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Mã giảm giá (Vouchers) của Store</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeVouchers.map(v => (
                <div key={v.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {v.code}
                    </span>
                    <span className="text-emerald-700 font-semibold">{v.title}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Giảm {formatVnd(v.discountValue)} cho đơn từ {formatVnd(v.minSpendVnd)}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Đã dùng: {v.usedCount} / {v.usageLimit} lượt
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Inventory Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Điều chỉnh Tồn kho Biến thể</h3>
            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn SKU Biến thể:</label>
                <select
                  value={selectedVariantId}
                  onChange={e => setSelectedVariantId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                >
                  {storeProducts.flatMap(p =>
                    p.variants.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.sku} - {p.name} ({v.title}) [Tồn hiện tại: {v.quantity}]
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số lượng thay đổi (dương nhập thêm, âm xuất bớt):</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lý do điều chỉnh (bắt buộc audit):</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="VD: Kiểm kê định kỳ phát hiện thừa, nhập thêm hàng..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Mời Nhân viên Vận hành Store (Seller)</h3>
            <form onSubmit={handleInviteStaff} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email nhân viên được mời:</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="nhanvien@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-200">
                <label className="block font-semibold text-slate-700">Tập 4 nhóm quyền được cấp:</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permProduct}
                    onChange={e => setPermProduct(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>1. Quản lý Sản phẩm (Đăng bán / Dừng bán)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permInventory}
                    onChange={e => setPermInventory(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>2. Quản lý Kho & Tồn (Xem & điều chỉnh tồn)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permOrder}
                    onChange={e => setPermOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>3. Xử lý Đơn hàng (Xác nhận, Giao hàng)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCod}
                    onChange={e => setPermCod(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>4. Thu tiền mặt COD khi giao hàng</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Gửi lời mời qua Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
