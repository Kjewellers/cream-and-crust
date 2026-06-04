import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MessageCircle,
  Check,
  X,
  ChevronRight,
  Trash2,
  Clock,
  SlidersHorizontal,
  Edit2,
  MoreHorizontal,
  FileText,
  CheckCircle,
  Download,
  User,
  Calendar,
  MapPin,
  Phone,
  Scale,
  Bike,
  Truck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  subscribeToOrders,
  subscribeToCustomers,
  addOrderToDB,
  updateOrderInDB,
  updateOrderStatusInDB,
  addCustomerToDB,
  deleteOrderFromDB,
  subscribeToRecipes,
} from '../services/db';
import { shareToWhatsApp } from '../services/whatsapp';
import { nativeShareFile } from '../services/nativeShare';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, formatCurrency, formatOrderNumber } from '../utils/date';
import { exportToCSV } from '../utils/exportUtils';
import { saveDraft, loadDraft, removeDraft } from '../utils/draftStore';
import { isOrderPendingPayment } from '../utils/finance';
import { safeDisplayValue } from '../utils/crypto';
import html2canvas from 'html2canvas';
import {
  downloadInvoicePdf,
  generateAndUploadInvoice,
  shareInvoicePdf,
} from '../utils/pdfGenerator';
import { uploadToCloudinary } from '../services/cloudinary';
import StatusBadge, { STATUS_COLORS } from '../components/orders/StatusBadge';
import StatusUpdateModal from '../components/orders/StatusUpdateModal';
import CalendarView from '../components/orders/CalendarView';
import CustomerProfileSheet from '../components/orders/CustomerProfileSheet';
import OrderForm from '../components/orders/OrderForm';
import PaymentToggle from '../components/orders/PaymentToggle';
import AnimatedNumber from '../components/AnimatedNumber';
import AnimatedDemo from '../components/AnimatedDemo';
import { ordersDemoScenes } from '../components/demos/ordersDemo';
import {
  OrderRowSkeleton,
  EmptyState,
  showToast,
  SegmentedControl,
  SwipeRow,
  BottomSheet,
  PullToRefresh,
  shareContent,
  triggerHaptic,
  OnboardingTutorial,
} from '../components/iOS';
import { listContainer, listItem, modalVariants } from '../utils/animations';

const statusFlow = ['inquiry', 'confirmed', 'delivered'];

function OrderRow({
  o,
  allOrders,
  onAdvance,
  onWhatsApp,
  onCustomerClick,
  onRapido,
  onOrderClick,
  onEdit,
  onDelete,
  onTogglePayment,
}) {
  const cName = safeDisplayValue(
    typeof o.customer === 'object'
      ? o.customer?.name
      : o.customerName || o.customer,
    'Customer'
  );
  const cPhone = safeDisplayValue(
    typeof o.customer === 'object' ? o.customer?.phone : o.phone
  );
  const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
  const pSize = o.size || (o.items && o.items[0]?.size) || '';
  const dDate = formatDate(o.date || o.createdAt);
  const totalNum = Number(o.total) || Number(o.totalAmount) || 0;
  const advNum = Number(o.advance) || 0;
  const isPaid =
    o.isPaid === true || (o.isPaid === undefined && advNum >= totalNum && totalNum > 0);
  const orderId = formatOrderNumber(o, allOrders);
  const isDelivered = String(o.status).toLowerCase() === 'delivered';

  const costNum = Number(o.cost) || 0;
  const marginPercentage =
    totalNum > 0 && costNum > 0 ? Math.round(((totalNum - costNum) / totalNum) * 100) : 0;

  return (
    <motion.tr
      variants={listItem}
      layout
      style={{ cursor: 'pointer' }}
      onClick={() => onOrderClick(o)}
    >
      <td>
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--accent)',
            letterSpacing: '-0.01em',
          }}
        >
          {orderId}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
          via {o.via || 'Direct'}
        </div>
      </td>
      <td>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onCustomerClick(o);
          }}
          style={{
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            color: 'var(--text)',
            borderBottom: '1px dashed var(--border)',
            display: 'inline-block',
          }}
        >
          {cName}
        </div>
        {cPhone && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{cPhone}</div>
        )}
      </td>
      <td>
        <div style={{ fontSize: 14 }}>{pName}</div>
        {(o.flavor || pSize) && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {[o.flavor, pSize].filter(Boolean).join(' · ')}
          </div>
        )}
        {Array.isArray(o.items) && o.items.length > 1 && (
          <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>
            +{o.items.length - 1} more items
          </div>
        )}
      </td>
      <td>
        <div style={{ fontSize: 13 }}>{dDate}</div>
        {(o.time || o.type) && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            {[o.time, o.type].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>
      <td>
        <StatusBadge status={o.status} />
      </td>
      <td>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(totalNum)}</div>
        {marginPercentage > 0 && (
          <div
            style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              color: '#2E7A5A',
              background: 'rgba(46,122,90,0.08)',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-block',
              marginTop: 2,
            }}
          >
            📈 {marginPercentage}% Profit
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePayment && onTogglePayment(o);
          }}
          style={{
            fontSize: 11,
            marginTop: 4,
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            borderRadius: 8,
            padding: '3px 10px',
            background: isPaid ? 'rgba(16,163,74,0.1)' : 'rgba(239,68,68,0.08)',
            color: isPaid ? '#16A34A' : '#EF4444',
            fontFamily: 'inherit',
          }}
        >
          {isPaid ? '✅ Paid' : '💰 Pending'}
        </button>
      </td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isDelivered && (
            <motion.button
              whileTap={{ scale: 0.86 }}
              className="btn-icon"
              title="Next Status"
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(o);
              }}
              style={{
                background: 'var(--accent)',
                color: 'white',
                width: 34,
                height: 34,
                borderRadius: 10,
              }}
            >
              <Check size={15} />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.86 }}
            className="btn-icon"
            title="WhatsApp"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(o);
            }}
            style={{ color: '#25D366', width: 34, height: 34, borderRadius: 10 }}
          >
            <MessageCircle size={15} />
          </motion.button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <motion.button
              whileTap={{ scale: 0.86 }}
              className="btn-icon"
              title="Book Rapido"
              onClick={(e) => {
                e.stopPropagation();
                onRapido(o);
              }}
              style={{
                background: '#F9C935',
                color: '#000',
                width: 34,
                height: 34,
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <Bike size={15} strokeWidth={2.4} />
            </motion.button>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>Rapido</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.86 }}
            className="btn-icon"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(o);
            }}
            style={{ color: '#D32F2F', width: 34, height: 34, borderRadius: 10, marginLeft: 6 }}
          >
            <Trash2 size={15} />
          </motion.button>
        </div>
      </td>
    </motion.tr>
  );
}

function MobileOrderCard({
  o,
  allOrders,
  onAdvance,
  onWhatsApp,
  onCustomerClick,
  onRapido,
  onOrderClick,
  onEdit,
  onDelete,
  onTogglePayment,
}) {
  const cName = safeDisplayValue(
    typeof o.customer === 'object'
      ? o.customer?.name
      : o.customerName || o.customer,
    'Customer'
  );
  const pName = o.product || (o.items && o.items[0]?.name) || 'Custom Order';
  const totalNum = Number(o.total) || Number(o.totalAmount) || 0;
  const advNum = Number(o.advance) || 0;
  const isPaid =
    o.isPaid === true || (o.isPaid === undefined && advNum >= totalNum && totalNum > 0);
  const orderId = formatOrderNumber(o, allOrders);
  const statusStr = String(o.status || 'inquiry').toLowerCase();
  const isDelivered = statusStr === 'delivered';
  const costNum = Number(o.cost) || 0;
  const marginPercentage =
    totalNum > 0 && costNum > 0 ? Math.round(((totalNum - costNum) / totalNum) * 100) : 0;

  // Map status to progress index
  const stages = ['inquiry', 'confirmed', 'baking', 'ready', 'delivered'];
  const currentIndex = stages.indexOf(statusStr);

  let statusBg = 'rgba(139, 92, 246, 0.08)';
  let statusColor = '#8B5CF6';
  if (statusStr === 'confirmed') {
    statusBg = 'rgba(181, 96, 106, 0.08)';
    statusColor = 'var(--accent)';
  } else if (statusStr === 'baking') {
    statusBg = 'rgba(245, 158, 11, 0.08)';
    statusColor = '#D97706';
  } else if (statusStr === 'ready') {
    statusBg = 'rgba(59, 130, 246, 0.08)';
    statusColor = '#3B82F6';
  } else if (isDelivered) {
    statusBg = 'rgba(16, 185, 129, 0.08)';
    statusColor = '#16A34A';
  } else if (statusStr === 'cancelled') {
    statusBg = 'rgba(239, 68, 68, 0.08)';
    statusColor = '#EF4444';
  }

  return (
    <motion.div variants={listItem} layout style={{ marginBottom: 14 }}>
      <SwipeRow onWhatsApp={() => onWhatsApp(o)}>
        <div
          style={{
            padding: '18px 16px',
            background: 'white',
            borderRadius: 24,
            border: '1px solid rgba(74, 59, 50, 0.04)',
            boxShadow: '0 4px 16px rgba(74,59,50,0.012)',
            cursor: 'pointer',
          }}
          onClick={() => onOrderClick(o)}
        >
          {/* Header Row: Avatar + Info */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cName)}`}
                alt={cName}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#FFF5EC',
                  border: '1px solid rgba(181,96,106,0.1)',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--text3)',
                      fontSize: '0.68rem',
                      letterSpacing: '0.02em',
                    }}
                  >
                    #{orderId}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: statusBg,
                      color: statusColor,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {statusStr}
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onCustomerClick(o);
                  }}
                  style={{
                    fontWeight: 900,
                    fontSize: '0.96rem',
                    color: 'var(--text)',
                    marginTop: 2,
                  }}
                >
                  {cName}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: '0.96rem', color: 'var(--text)' }}>
                {formatCurrency(totalNum)}
              </div>
              {marginPercentage > 0 && (
                <div
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    color: '#2E7A5A',
                    background: 'rgba(46,122,90,0.08)',
                    padding: '2px 6px',
                    borderRadius: 6,
                    display: 'inline-block',
                    marginTop: 2,
                  }}
                >
                  📈 {marginPercentage}% Profit
                </div>
              )}
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: isPaid ? '#16A34A' : '#EF4444',
                  marginTop: 3,
                }}
              >
                {isPaid ? 'Paid ✓' : `${formatCurrency(totalNum - advNum)} due`}
              </div>
            </div>
          </div>

          {/* Cake Flavour / Product detail */}
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text2)',
              fontWeight: 600,
              background: 'rgba(74,59,50,0.015)',
              padding: '8px 12px',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            🎂 {pName}
            {Array.isArray(o.items) && o.items.length > 1 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  marginLeft: 6,
                  background: 'rgba(181,96,106,0.1)',
                  padding: '2px 7px',
                  borderRadius: 8,
                }}
              >
                +{o.items.length - 1} items
              </span>
            )}
          </div>

          {/* Items breakdown (when multiple items exist) */}
          {Array.isArray(o.items) && o.items.length > 0 && (
            <div style={{ marginBottom: 12, padding: '0 4px' }}>
              {o.items
                .filter((item) => item && item.name)
                .map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 0',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: 'var(--text2)', fontWeight: 600 }}>
                      {idx + 1}. {item.name}
                    </span>
                    <span style={{ color: 'var(--text)', fontWeight: 700 }}>
                      {item.qty ? `×${item.qty}` : ''}
                      {item.price ? ` ₹${item.price}` : ''}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Dynamic Interactive Progress Timeline */}
          <div style={{ marginBottom: 16, padding: '0 4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                position: 'relative',
                alignItems: 'center',
              }}
            >
              {/* Connector line behind stages */}
              <div
                style={{
                  position: 'absolute',
                  left: '2%',
                  right: '2%',
                  height: 3,
                  background: 'rgba(74, 59, 50, 0.05)',
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '2%',
                  width: `${currentIndex >= 0 ? (currentIndex / 4) * 96 : 0}%`,
                  height: 3,
                  background: 'var(--accent)',
                  zIndex: 1,
                  transition: 'width 0.3s ease',
                }}
              />

              {stages.map((stage, idx) => {
                const isCompleted = idx <= currentIndex;
                const isCurrent = idx === currentIndex;

                return (
                  <div
                    key={stage}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--accent)' : 'white',
                      border: isCompleted ? 'none' : '2px solid rgba(74, 59, 50, 0.15)',
                      zIndex: 2,
                      boxShadow: isCurrent ? '0 0 0 3px rgba(181, 96, 106, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                    }}
                    title={stage.toUpperCase()}
                  />
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: '0.52rem',
                fontWeight: 800,
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              <span>Inquiry</span>
              <span>Confirm</span>
              <span>Bake</span>
              <span>Ready</span>
              <span>Deliver</span>
            </div>
          </div>

          {/* Payment toggle — manual mark Paid / Pending (animated) */}
          <PaymentToggle
            paid={isPaid}
            amountLabel={formatCurrency(totalNum - advNum)}
            onToggle={() => onTogglePayment && onTogglePayment(o)}
          />

          {/* Bottom Card details and Actions Pill bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 12,
              borderTop: '1px dashed rgba(74, 59, 50, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', fontWeight: 700 }}>
              {formatDate(o.date || o.createdAt)} ·{' '}
              {formatTime(o.time || o.deliveryTime || '10:00')}
            </div>

            {/* Premium Rounded Action Pills row */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* WhatsApp */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp(o);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#25D366',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,211,102,0.15)',
                }}
                title="WhatsApp Client"
              >
                <MessageCircle size={13} strokeWidth={3} />
              </button>

              {/* Rapido */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRapido(o);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#F9C935',
                  color: '#000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(249,201,53,0.15)',
                }}
                title="Rapido Scooter"
              >
                <Bike size={15} strokeWidth={2.4} />
              </button>

              {/* Next status advance */}
              {!isDelivered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance(o);
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(181,96,106,0.15)',
                  }}
                  title="Next Pipeline Stage"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              )}

              {/* Invoice Generation */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('light');
                  showToast('Generating invoice PDF...', 'info');
                  onOrderClick(o);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(74, 59, 50, 0.05)',
                  color: 'var(--text2)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Download Invoice"
              >
                <FileText size={13} strokeWidth={2.5} />
              </button>

              {/* Edit Order */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(o);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(181, 96, 106, 0.08)',
                  color: 'var(--accent)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Edit Order Details"
              >
                <Edit2 size={12} strokeWidth={2.5} />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(o);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(211,47,47,0.06)',
                  color: '#D32F2F',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Delete Order"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </SwipeRow>
    </motion.div>
  );
}

const emptyForm = {
  customer: '',
  phone: '',
  product: '',
  size: '1kg',
  quantity: '1',
  date: '',
  time: '',
  deliveryType: 'delivery',
  deliveryAddress: '',
  landmark: '',
  city: '',
  pincode: '',
  occasion: '',
  mapsLink: '',
  total: '',
  advance: '',
  cost: '',
  notes: '',
  recipeId: '',
  items: [],
  category: '',
  orderSource: '',
  discount: '',
  discountType: 'flat',
  paymentMethod: '',
};

const ORDER_SOURCES = ['Instagram', 'WhatsApp', 'Walk-in', 'Website', 'Referral', 'Phone Call'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Online', 'Partial'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  // When set, the modal saves via updateOrderInDB instead of addOrderToDB.
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [generatedOrderCard, setGeneratedOrderCard] = useState(null);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState(null);
  const [showSwipeGuide, setShowSwipeGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSwipeBanner, setShowSwipeBanner] = useState(true);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  // Payment filter: 'all' | 'pending' | 'paid'
  const [paymentFilter, setPaymentFilter] = useState('all');
  // Saved categories (persisted per user)
  const [savedCategories, setSavedCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(`cc_orderCategories:${currentUser?.uid}`);
      return saved
        ? JSON.parse(saved)
        : ['Cake', 'Cupcakes', 'Pastry', 'Bread', 'Cookies', 'Custom'];
    } catch {
      return ['Cake', 'Cupcakes', 'Pastry', 'Bread', 'Cookies', 'Custom'];
    }
  });
  const [recipeList, setRecipeList] = useState([]); // Task 3.9
  // Status-update WhatsApp modal state (replaces the popup-blocked confirm+setTimeout)
  const [statusUpdate, setStatusUpdate] = useState(null);
  const { currentUser, isCustomer, business } = useAuth();

  // ── Order-form draft persistence (production hardening, Req 7) ──────
  // Auto-save the in-progress NEW order so a refresh / accidental close /
  // process death never loses the baker's work. Editing an existing order is
  // not drafted (it already exists in Firestore).
  const draftKey = `order:${currentUser?.uid || 'anon'}`;
  const draftRestoredRef = React.useRef(false);

  // Helper: is the form meaningfully filled (not just the empty default)?
  const isFormEmpty = (f) =>
    !f.customer && !f.phone && !f.product && !f.total && (!f.items || f.items.length === 0);

  // Restore a saved draft when the New Order modal opens.
  useEffect(() => {
    if (!showModal || editingOrderId || draftRestoredRef.current) return;
    const draft = loadDraft(draftKey);
    if (draft && typeof draft === 'object' && !isFormEmpty(draft)) {
      setForm((prev) => ({ ...prev, ...draft }));
      draftRestoredRef.current = true;
      showToast('Draft restored ✨', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, editingOrderId, draftKey]);

  // Debounced auto-save while editing a NEW order (at most once/second).
  // Only saves when the form has meaningful content (not the empty default).
  useEffect(() => {
    if (!showModal || editingOrderId) return undefined;
    if (isFormEmpty(form)) return undefined;
    const t = setTimeout(() => saveDraft(draftKey, form), 1000);
    return () => clearTimeout(t);
  }, [form, showModal, editingOrderId, draftKey]);

  // Reset the "already restored" guard when the modal closes.
  useEffect(() => {
    if (!showModal) draftRestoredRef.current = false;
  }, [showModal]);

  const handleDownloadCard = async () => {
    const cardElement = document.getElementById('order-card-capture');
    if (!cardElement) return;
    try {
      showToast('Generating card...', 'info', 1000);
      const canvas = await html2canvas(cardElement, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      console.log('[Orders] handleDownloadCard: canvas generated, sharing...');
      const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const fileName = `Order_${generatedOrderCard?.orderId || 'Card'}.png`;

      await nativeShareFile({
        blob: imageBlob,
        fileName,
        title: 'Order Card',
        text: `Cream & Crust order confirmation 🧁`,
        mimeType: 'image/png',
      });

      triggerHaptic('success');
      showToast('Card shared!', 'success');
    } catch (err) {
      console.error('[Orders] handleDownloadCard error:', err);
      showToast('Failed to save card', 'error');
    }
  };

  const filtered = (orders || []).filter((o) => {
    if (!o) return false;
    const searchLower = search.toLowerCase();
    const c = o.customer;
    const customerName = typeof c === 'object' ? c?.name || '' : String(c || '');
    const matchesSearch =
      !search ||
      customerName.toLowerCase().includes(searchLower) ||
      String(o.orderId || o.id || '')
        .toLowerCase()
        .includes(searchLower) ||
      (o.product || '').toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || String(o.status).toLowerCase() === filter;
    // Payment filter — uses the shared finance logic so it matches the
    // Payments module and respects the explicit isPaid flag.
    let matchesPayment = true;
    if (paymentFilter === 'pending') {
      matchesPayment = isOrderPendingPayment(o);
    } else if (paymentFilter === 'paid') {
      matchesPayment = !isOrderPendingPayment(o);
    }
    return matchesSearch && matchesFilter && matchesPayment;
  });

  const pipelineCounts = (orders || []).reduce((acc, o) => {
    if (o && o.status) {
      const s = String(o.status).toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, {});

  const statsData = [
    {
      label: 'Total Orders',
      value: orders.length,
      icon: Plus,
      bg: 'rgba(181, 96, 106, 0.1)',
      color: 'var(--accent)',
    },
    {
      label: 'Confirmed',
      value: (orders || []).filter((o) => String(o.status).toLowerCase() === 'confirmed').length,
      icon: Check,
      bg: 'rgba(212, 160, 80, 0.1)',
      color: '#A06820',
    },
    {
      label: 'Baking / Ready',
      value: (orders || []).filter((o) =>
        ['baking', 'ready'].includes(String(o.status).toLowerCase())
      ).length,
      icon: Search,
      bg: 'rgba(240, 184, 179, 0.15)',
      color: '#B04040',
    },
    {
      label: 'Delivered',
      value: (orders || []).filter((o) => String(o.status).toLowerCase() === 'delivered').length,
      icon: MessageCircle,
      bg: 'rgba(46, 122, 90, 0.1)',
      color: '#2E7A5A',
    },
  ];

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('cc_onboarding_completed');
    if (!hasSeenOnboarding && !loading && orders.length > 0) {
      setShowOnboarding(true);
    }
  }, [loading, orders.length]);

  useEffect(() => {
    // Wait for Firebase auth to restore the user before subscribing.
    // Subscribing too early (before auth.currentUser exists) queries with
    // "NO_USER" and trips a permission error whose path never clears the
    // loader — that's why Orders only loaded after a few refreshes.
    const uid = currentUser?.uid;
    if (!uid) {
      // No user yet — keep showing the loader, but don't hang forever.
      return undefined;
    }

    setLoading(true);

    // Safety net: never let the loader hang. If no data/error arrives in
    // time, drop the spinner so the page renders (empty state if needed).
    const safety = setTimeout(() => setLoading(false), 8000);

    const handleOrders = (newOrders) => {
      clearTimeout(safety);
      setOrders(newOrders || []);
      setLoading(false);
      // If we arrived from Calendar with an order to open, show its card.
      try {
        const openId = window.history.state?.usr?.openOrderId;
        if (openId) {
          const match = (newOrders || []).find((o) => o.id === openId);
          if (match) {
            setGeneratedOrderCard(match);
            // Clear the state so it doesn't reopen on next render
            window.history.replaceState({ ...window.history.state, usr: {} }, '');
          }
        }
      } catch (e) {}
    };

    const handleError = (err) => {
      clearTimeout(safety);
      console.error('Orders load error:', err);
      setLoading(false); // render rather than hang on a stuck spinner
    };

    let unsubOrders = subscribeToOrders(handleOrders, uid, handleError);
    let unsubCustomers = subscribeToCustomers(
      (newCust) => setCustomers(newCust || []),
      undefined,
      uid
    );
    return () => {
      clearTimeout(safety);
      unsubOrders && unsubOrders();
      unsubCustomers && unsubCustomers();
    };
  }, [isCustomer, currentUser]);

  // Task 3.9 — Subscribe to recipes for the recipeId picker
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToRecipes(
      (recipes) => {
        setRecipeList(recipes || []);
      },
      null,
      currentUser.uid
    );
    return () => unsub && unsub();
  }, [currentUser]);

  // Auto-fill logic
  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, phone: val };
      if (val.length >= 10) {
        const existing = customers.find((c) => c.phone === val);
        if (existing) {
          next.customer = existing.name || prev.customer;
          next.deliveryAddress = existing.address || prev.deliveryAddress;
        }
      }
      return next;
    });
  };

  const handleDeleteOrder = async (o) => {
    if (window.confirm('Are you sure you want to delete this order? This cannot be undone.')) {
      try {
        await deleteOrderFromDB(o.id);
        triggerHaptic('success');
        showToast('Order deleted', 'success');
        if (generatedOrderCard?.id === o.id) setGeneratedOrderCard(null);
      } catch (err) {
        showToast('Failed to delete', 'error');
      }
    }
  };

  const updateStatus = async (o) => {
    const idx = statusFlow.indexOf(String(o.status).toLowerCase());
    if (idx < statusFlow.length - 1) {
      const next = statusFlow[idx + 1];
      await updateOrderStatusInDB(o.id, next);
      triggerHaptic('medium');
      showToast(`Order → ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'success');

      if (next === 'delivered') {
        try {
          showToast('Generating invoice PDF...', 'info');
          const pdfUrl = await generateAndUploadInvoice(o, business);
          const isLocalInvoice = String(pdfUrl).startsWith('blob:');
          await updateOrderStatusInDB(o.id, next, {
            invoiceUrl: isLocalInvoice ? '' : pdfUrl,
            invoiceGeneratedAt: new Date().toISOString(),
          });
          if (!isLocalInvoice) o.invoiceUrl = pdfUrl;
          showToast('Invoice generated successfully!', 'success');
        } catch (err) {
          console.error('Invoice gen failed:', err);
          showToast('Failed to generate invoice', 'error');
        }
      }
    }
  };

  // Toggle payment status (Paid <-> Pending) without freezing.
  // Optimistically flips local state, persists in background.
  // `isPaid` is the AUTHORITATIVE flag — we do NOT overwrite `advance`, so
  // toggling back to Pending actually sticks (previously advance was set to
  // total, which made the derived "paid" check re-trigger and the toggle
  // appear stuck on).
  const togglePayment = async (o) => {
    const total = Number(o.total || o.totalAmount || 0);
    const currentlyPaid =
      o.isPaid === true || (o.isPaid === undefined && total > 0 && Number(o.advance || 0) >= total);
    const nextPaid = !currentlyPaid;
    triggerHaptic(nextPaid ? 'success' : 'light');
    // Optimistic local update so the toggle never freezes.
    setOrders((prev) =>
      prev.map((x) =>
        x.id === o.id
          ? {
              ...x,
              isPaid: nextPaid,
              paymentStatus: nextPaid ? 'paid' : 'pending',
              balanceDue: nextPaid ? 0 : Math.max(0, total - Number(x.advance || 0)),
            }
          : x
      )
    );
    try {
      await updateOrderInDB(o.id, {
        isPaid: nextPaid,
        balanceDue: nextPaid ? 0 : Math.max(0, total - Number(o.advance || 0)),
        paymentStatus: nextPaid ? 'paid' : 'pending',
      });
      showToast(nextPaid ? 'Marked as Paid ✓' : 'Marked as Pending', 'success');
    } catch (err) {
      // Revert on failure
      setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)));
      showToast('Failed to update payment', 'error');
    }
  };

  const handleWhatsApp = async (o) => {
    // If no order card is showing (list-level WA button), send a text link
    const cardElement = document.getElementById('order-card-capture');
    if (!cardElement) {
      shareToWhatsApp(o);
      showToast('Opening WhatsApp...', 'info', 2000);
      return;
    }

    try {
      showToast('Preparing card image...', 'info', 1500);
      triggerHaptic('light');

      // 1. Capture the order card element
      console.log('[Orders] handleWhatsApp: capturing card with html2canvas...');
      const canvas = await html2canvas(cardElement, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imageBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const fileName = `Order_${o.orderId || 'Card'}.png`;

      console.log('[Orders] handleWhatsApp: blob ready, sharing via nativeShareFile...');

      // 2. Share natively (writes to cache + opens share sheet on Android)
      //    On Android this opens the native share sheet; user picks WhatsApp.
      //    On web it tries Web Share API then downloads.
      await nativeShareFile({
        blob: imageBlob,
        fileName,
        title: `Order Card #${o.orderId || ''}`,
        text: `Cream & Crust order confirmation for ${typeof o.customer === 'object' ? o.customer?.name : o.customerName || o.customer || 'Valued Customer'} 🧁`,
        mimeType: 'image/png',
      });

      triggerHaptic('success');
      showToast('Shared successfully!', 'success');
    } catch (err) {
      console.error('[Orders] handleWhatsApp error:', err);
      // Final fallback: open WhatsApp with text message
      shareToWhatsApp(o);
      showToast('Opening WhatsApp...', 'info', 2000);
    }
  };

  const handleRapidoBooking = async (order) => {
    if (!order.deliveryAddress) {
      return showToast('No delivery address provided!', 'error');
    }
    try {
      await navigator.clipboard.writeText(order.deliveryAddress);
      triggerHaptic('light');
      showToast('Address copied! Opening Rapido...', 'info', 2000);
    } catch (e) {
      triggerHaptic('error');
      showToast('Opening Rapido...', 'info', 2000);
    }
    // Opening the Rapido website will automatically launch the Rapido App on mobile devices if installed via Universal Links
    window.open('https://rapido.bike/', '_blank');
  };

  const openCustomerProfile = (order) => {
    const phoneToFind = typeof order.customer === 'object' ? order.customer?.phone : order.phone;
    const cust = customers.find((c) => c.phone === phoneToFind);
    if (cust) {
      // Sanitize — ensure no encrypted strings leak to the profile sheet
      setSelectedCustomerProfile({
        ...cust,
        name: safeDisplayValue(cust.name, 'Customer'),
        phone: safeDisplayValue(cust.phone, ''),
        address: safeDisplayValue(cust.address, ''),
      });
    } else {
      setSelectedCustomerProfile({
        name: safeDisplayValue(
          typeof order.customer === 'object'
            ? order.customer?.name
            : order.customerName || order.customer,
          'Customer'
        ),
        phone: safeDisplayValue(
          typeof order.customer === 'object' ? order.customer?.phone : order.phone
        ),
        address: safeDisplayValue(order.deliveryAddress),
        totalOrders: 1,
        totalSpent: order.total || order.totalAmount,
      });
    }
  };

  const addOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const totalAmount = Number(form.total) || 0;
      const advancePaid = Number(form.advance) || 0;
      const balanceDue = Math.max(0, totalAmount - advancePaid);

      // Upload reference image if present
      let finalReferenceImage = form.referenceImage || null;
      if (form.referenceFile) {
        try {
          showToast('Uploading reference image...', 'info');
          finalReferenceImage = await uploadToCloudinary(form.referenceFile);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          showToast('Image upload failed, saving without it', 'error');
        }
      }

      const formToSave = { ...form };
      delete formToSave.referenceFile;
      if (finalReferenceImage) {
        formToSave.referenceImage = finalReferenceImage;
      }

      // ── Edit mode ── update an existing order without changing status/orderId.
      if (editingOrderId) {
        const patch = {
          ...formToSave,
          advance: advancePaid,
          total: totalAmount,
          totalAmount: totalAmount,
          balanceDue,
          isPaid: balanceDue === 0,
          recipeId: formToSave.recipeId || null,
          updatedAt: new Date().toISOString(),
        };
        // Don't overwrite createdAt/status/orderId on edit.
        delete patch.createdAt;
        delete patch.status;
        delete patch.orderId;
        delete patch.id; // Also remove doc id from payload
        await updateOrderInDB(editingOrderId, patch);
        setShowModal(false);
        setForm(emptyForm);
        setEditingOrderId(null);
        triggerHaptic('success');
        showToast('Order updated ✓', 'success');
        return;
      }

      const newOrder = {
        ...formToSave,
        status: 'inquiry',
        advance: advancePaid,
        total: totalAmount,
        totalAmount: totalAmount, // for compatibility
        balanceDue: balanceDue,
        isPaid: balanceDue === 0,
        via: 'Direct',
        orderId: `CC-${String(orders.length + 101).padStart(3, '0')}`,
        userId: currentUser?.uid || null,
        recipeId: formToSave.recipeId || null, // Task 3.9 — link recipe for deduction
        createdAt: new Date().toISOString(),
      };

      const docId = await addOrderToDB(newOrder);
      const finalOrder = { id: docId, ...newOrder };

      // Add to customers if doesn't exist
      const existingCust = customers.find((c) => c.phone === form.phone);
      if (!existingCust && form.phone && form.customer) {
        await addCustomerToDB({
          name: form.customer,
          phone: form.phone,
          address: form.deliveryAddress || '',
          lastOrder: new Date().toISOString(),
        });
      }

      setShowModal(false);
      setForm(emptyForm);
      removeDraft(draftKey); // clear the saved draft on successful submit (Req 7.5)
      triggerHaptic('success');
      showToast('Order saved! Generating card... 🎂', 'success');

      // Show Order Card
      setTimeout(() => {
        setGeneratedOrderCard(finalOrder);
      }, 300);
    } catch (err) {
      showToast(editingOrderId ? 'Failed to update order' : 'Failed to create order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open the form prefilled with an existing order's values.
  const openEditOrder = (o) => {
    if (!o) return;
    triggerHaptic('light');
    const customerName =
      typeof o.customer === 'object' ? o.customer?.name || '' : o.customerName || o.customer || '';
    const phone =
      (typeof o.customer === 'object' ? o.customer?.phone : o.phone) || o.customerPhone || '';
    setForm({
      ...emptyForm,
      ...o,
      customer: customerName,
      phone,
      total: String(o.total ?? o.totalAmount ?? ''),
      advance: String(o.advance ?? o.amountPaid ?? ''),
      cost: String(o.cost ?? ''),
      recipeId: o.recipeId || '',
    });
    setEditingOrderId(o.id);
    setShowModal(true);
  };

  // Prefill the New Order modal from a past order — same shape as
  // openEditOrder but we explicitly DO NOT set editingOrderId so the
  // submit goes through addOrderToDB and produces a fresh order. We
  // also blank out per-order metadata (status, payment) so the new
  // copy starts at the default state instead of inheriting "delivered".
  const repeatOrder = (o) => {
    if (!o) return;
    triggerHaptic('light');
    const customerName =
      typeof o.customer === 'object' ? o.customer?.name || '' : o.customerName || o.customer || '';
    const phone =
      (typeof o.customer === 'object' ? o.customer?.phone : o.phone) || o.customerPhone || '';
    setForm({
      ...emptyForm,
      ...o,
      id: undefined,
      orderId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      status: emptyForm.status ?? 'inquiry',
      isPaid: false,
      balanceDue: undefined,
      amountPaid: undefined,
      advance: '',
      customer: customerName,
      phone,
      total: String(o.total ?? o.totalAmount ?? ''),
      cost: String(o.cost ?? ''),
      recipeId: o.recipeId || '',
    });
    setEditingOrderId(null);
    setShowModal(true);
    showToast('Prefilled from previous order', 'info');
  };

  const segOptions = [
    { value: 'all', label: 'All' },
    { value: 'inquiry', label: 'Inquiry' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'baking', label: 'Baking' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  if (generatedOrderCard) {
    const o = generatedOrderCard;

    // Split notes into elegant bullet points
    const notesList = o.notes
      ? o.notes
          .split(/[\n,]+/)
          .map((n) => n.trim())
          .filter(Boolean)
      : [];

    // Choose template image (default chocolate cake or dynamically selected based on flavor)
    let cakePreviewImage = o.referenceImage || '/assets/templates/wedding_premium_hero_1778776255942.png';
    if (!o.referenceImage) {
      const productLower = (o.product || '').toLowerCase();
      if (
        productLower.includes('truffle') ||
        productLower.includes('chocolate') ||
        productLower.includes('dark')
      ) {
        cakePreviewImage = '/assets/templates/product_truffle_1778776334868.png';
      } else if (productLower.includes('velvet') || productLower.includes('red')) {
        cakePreviewImage = '/assets/templates/product_red_velvet_1778776354239.png';
      } else if (productLower.includes('cheese') || productLower.includes('berry')) {
        cakePreviewImage = '/assets/templates/product_cheesecake_1778776370456.png';
      }
    }

    const customerFirstName = (o.customer || o.customerName || 'Dear').split(' ')[0];
    const customMessage = o.notes ? o.notes : 'Thank you for choosing Cream & Crust!';

    return (
      <div
        style={{
          padding: '16px 4px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'fade-in 0.3s ease-out',
          transform: 'scale(0.85)',
          transformOrigin: 'top center',
          marginBottom: '-100px',
        }}
      >
        {/* Responsive viewport container */}
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px 0',
          }}
        >
          {/* Vertical luxury card capture block (Ensures mobile pixel-perfection on canvas captures) */}
          <div
            id="order-card-capture"
            style={{
              width: 420,
              minHeight: 740,
              height: 'auto',
              minWidth: 420,
              background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF5F2 100%)',
              borderRadius: 28,
              padding: '28px 22px 22px 22px',
              boxShadow: '0 12px 40px rgba(181, 96, 106, 0.06)',
              border: '1.5px solid #FFEBE5',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Crown Icon above title */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 3,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="16"
                viewBox="0 0 24 18"
                fill="#FFB300"
                stroke="#E65100"
                strokeWidth="1.5"
              >
                <path d="M2,16 L22,16 L20,6 L15,11 L12,4 L9,11 L4,6 Z" />
                <circle cx="12" cy="3" r="1.2" fill="#D84315" />
                <circle cx="4" cy="5" r="1" fill="#D84315" />
                <circle cx="20" cy="5" r="1" fill="#D84315" />
              </svg>
            </div>

            {/* Top-Right Cherry Blossom SVG with Sparkles */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 130,
                height: 130,
                pointerEvents: 'none',
                zIndex: 1,
              }}
              viewBox="0 0 100 100"
            >
              {/* Branch */}
              <path
                d="M100,20 C85,25 75,40 70,55"
                fill="none"
                stroke="#D7CCC8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M90,22 C80,18 78,8 75,0"
                fill="none"
                stroke="#D7CCC8"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Big Flower 1 */}
              <g transform="translate(75, 40)">
                <circle cx="0" cy="0" r="4" fill="#FF8A80" />
                <path
                  d="M0,-3 C-3,-8 3,-8 0,-3 Z M3,0 C8,-3 8,3 3,0 Z M0,3 C3,8 -3,8 0,3 Z M-3,0 C-8,3 -8,-3 -3,0 Z"
                  fill="#FFCDD2"
                  stroke="#FF8A80"
                  strokeWidth="0.5"
                />
                <circle cx="0" cy="0" r="1.5" fill="#FFE082" />
              </g>
              {/* Big Flower 2 */}
              <g transform="translate(88, 18)">
                <circle cx="0" cy="0" r="3.5" fill="#FF8A80" />
                <path
                  d="M0,-2.5 C-2.5,-7 2.5,-7 0,-2.5 Z M2.5,0 C7,-2.5 7,2.5 2.5,0 Z M0,2.5 C2.5,7 -2.5,7 0,2.5 Z M-2.5,0 C-7,2.5 -7,-2.5 -2.5,0 Z"
                  fill="#FFCDD2"
                  stroke="#FF8A80"
                  strokeWidth="0.5"
                />
                <circle cx="0" cy="0" r="1.2" fill="#FFE082" />
              </g>
              {/* Sparkles */}
              <path
                d="M55,38 L56.5,41 L59.5,42 L56.5,43 L55,46 L53.5,43 L50.5,42 L53.5,41 Z"
                fill="#FFE082"
              />
              <path
                d="M72,70 L73,72 L75,72.5 L73,73 L72,75 L71,73 L69,72.5 L71,72 Z"
                fill="#FFE082"
              />
            </svg>

            {/* Header row with circular logo and company title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                position: 'relative',
                zIndex: 2,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#FFF',
                  border: '2px solid #FFF0ED',
                  boxShadow: '0 4px 14px rgba(181, 96, 106, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={business?.logoUrl || '/logo.png'}
                  alt="Logo"
                  style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: '"Playfair Display", Georgia, serif',
                    color: '#4A3B32',
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  {business?.name || 'Cream & Crust Bakery'}
                </h2>
                <div
                  style={{
                    color: '#E38A95',
                    fontSize: 16,
                    fontWeight: 'normal',
                    fontFamily: '"Playball", cursive',
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  Made with love <span style={{ color: '#E38A95' }}>❤️</span>
                </div>
              </div>
            </div>

            {/* ORDER CONFIRMED Banner */}
            <div
              style={{
                background: '#EDF7ED',
                border: '1.5px solid #C8E6C9',
                borderRadius: 18,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 2px 8px rgba(76,175,80,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                {/* Left leaf sprig */}
                <span style={{ fontSize: '14px', color: '#81C784', marginRight: -2 }}>🌿</span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#2E7D32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Check size={16} color="white" strokeWidth={3.5} />
                </div>
                {/* Right leaf sprig */}
                <span
                  style={{
                    fontSize: '14px',
                    color: '#81C784',
                    marginLeft: -2,
                    transform: 'scaleX(-1)',
                    display: 'inline-block',
                  }}
                >
                  🌿
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: 0,
                    color: '#1B5E20',
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                  }}
                >
                  ORDER CONFIRMED 🎉
                </h3>
                <div style={{ color: '#2E7D32', fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  We're excited to bake your celebration! 🎂
                </div>
              </div>
              {/* Green Sparkles */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                style={{ fill: '#81C784', opacity: 0.8 }}
              >
                <path d="M12,2 L14,8 L20,10 L14,12 L12,18 L10,12 L4,10 L10,8 Z" />
              </svg>
            </div>

            {/* Main Product & Delivery Details white block */}
            <div
              style={{
                background: 'white',
                borderRadius: 20,
                padding: '16px',
                border: '1.5px solid rgba(181, 96, 106, 0.08)',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 4px 16px rgba(181, 96, 106, 0.015)',
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: 16,
                alignItems: 'center',
              }}
            >
              {/* Product Image left */}
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#FFF5F5',
                  border: '1px solid #FFEBE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <img
                  src={cakePreviewImage}
                  alt="Product"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Heart Ribbon Badge on top-left of image */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1.5px solid #FFCDD2',
                    boxShadow: '0 2px 6px rgba(181, 96, 106, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: '#E38A95',
                  }}
                >
                  ❤️
                </div>
              </div>

              {/* Delivery info right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#FFF0EE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>🎂</span>
                  </div>
                  <span
                    style={{
                      color: '#4A3B32',
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 17,
                      fontWeight: 900,
                    }}
                  >
                    {o.product || 'Chocolate Cake'}
                  </span>
                  <span
                    style={{
                      background: '#FFF0EE',
                      color: '#B5606A',
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ⚖️ {o.size || '1kg'}
                  </span>
                </div>

                {/* Multiple items list */}
                {Array.isArray(o.items) && o.items.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      borderTop: '1px dashed rgba(181, 96, 106, 0.12)',
                      paddingTop: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#9E8E85',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Order Items ({o.items.length})
                    </div>
                    {o.items
                      .filter((item) => item && item.name)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '5px 0',
                            borderBottom:
                              idx < o.items.length - 1
                                ? '1px dotted rgba(181,96,106,0.08)'
                                : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#B5606A', fontWeight: 800 }}>
                              {idx + 1}.
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4A3B32' }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {item.qty && (
                              <span style={{ fontSize: 11, color: '#9E8E85', fontWeight: 600 }}>
                                ×{item.qty}
                              </span>
                            )}
                            {item.price && (
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#B5606A' }}>
                                ₹{item.price}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px dashed rgba(181, 96, 106, 0.12)',
                    paddingTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Row 1: Delivery Date */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        color: '#9E8E85',
                        fontWeight: 650,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={13} color="#B5606A" strokeWidth={2.5} /> Delivery Date
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800 }}>{formatDate(o.date)}</span>
                  </div>
                  {/* Row 2: Delivery Time */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        color: '#9E8E85',
                        fontWeight: 650,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Clock size={13} color="#B5606A" strokeWidth={2.5} /> Delivery Time
                    </span>
                    <span style={{ color: '#4A3B32', fontWeight: 800 }}>
                      {formatTime(o.time) || '3:40 PM'}
                    </span>
                  </div>
                  {/* Row 3: Customer Name — stacked layout for long names */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      marginTop: 4,
                      padding: '8px 10px',
                      background: 'rgba(181, 96, 106, 0.04)',
                      borderRadius: 10,
                    }}
                  >
                    <span
                      style={{
                        color: '#9E8E85',
                        fontWeight: 650,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                      }}
                    >
                      <User size={12} color="#B5606A" strokeWidth={2.5} /> Customer
                    </span>
                    <span
                      style={{
                        color: '#4A3B32',
                        fontWeight: 800,
                        fontSize: 13,
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {typeof o.customer === 'object'
                        ? o.customer?.name || ''
                        : String(o.customer || o.customerName || 'Valued Customer')}
                    </span>
                  </div>
                  {/* Row 4: Delivery Address — stacked layout for long addresses */}
                  {o.deliveryAddress && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        padding: '8px 10px',
                        background: 'rgba(181, 96, 106, 0.04)',
                        borderRadius: 10,
                      }}
                    >
                      <span
                        style={{
                          color: '#9E8E85',
                          fontWeight: 650,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                        }}
                      >
                        <MapPin size={12} color="#B5606A" strokeWidth={2.5} /> Delivery Address
                      </span>
                      <span
                        style={{
                          color: '#4A3B32',
                          fontWeight: 700,
                          fontSize: 12,
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {o.deliveryAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div
              style={{
                background: 'white',
                borderRadius: 20,
                padding: '14px 16px',
                border: '1.5px solid rgba(181, 96, 106, 0.08)',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 4px 16px rgba(181, 96, 106, 0.015)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 'bold',
                  color: '#4A3B32',
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: '14px' }}>💳</span>
                <span>Payment Summary</span>
                {/* Tiny pink sparkles */}
                <span style={{ color: '#E38A95', fontSize: '11px', marginLeft: 4 }}>✨</span>
              </div>

              {/* 3 cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {/* Total Card */}
                <div
                  style={{
                    background: '#FDFDFD',
                    border: '1px solid rgba(74, 59, 50, 0.08)',
                    borderRadius: 12,
                    padding: '10px 6px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 85,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '8px',
                        color: '#888',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Total Amount
                    </div>
                    <div
                      style={{ fontSize: '13px', color: '#2E7D32', fontWeight: 900, marginTop: 4 }}
                    >
                      {formatCurrency(o.total)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#E8F5E9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: '10px' }}>🛍️</span>
                  </div>
                </div>

                {/* Paid Card */}
                <div
                  style={{
                    background: '#EDF7ED',
                    border: '1px solid #C8E6C9',
                    borderRadius: 12,
                    padding: '10px 6px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 85,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '8px',
                        color: '#2E7D32',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Amount Paid
                    </div>
                    <div
                      style={{ fontSize: '13px', color: '#2E7D32', fontWeight: 900, marginTop: 4 }}
                    >
                      {formatCurrency(o.advance)}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#2E7D32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Check size={9} color="white" strokeWidth={4} />
                  </div>
                </div>

                {/* Due Card */}
                <div
                  style={{
                    background: '#FFF0EE',
                    border: '1px solid #FFCDD2',
                    borderRadius: 12,
                    padding: '10px 6px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 85,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '8px',
                        color: '#B5606A',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Remaining Due
                    </div>
                    <div
                      style={{ fontSize: '13px', color: '#C2185B', fontWeight: 900, marginTop: 4 }}
                    >
                      {formatCurrency(Math.max(0, (o.total || 0) - (o.advance || 0)))}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: '#FFF0EE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#C2185B"
                      strokeWidth="3"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="12" y1="4" x2="12" y2="20" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Customizations horizontal pill bar */}
            <div
              style={{
                background: '#FFF0EE',
                borderRadius: 14,
                padding: '8px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#B5606A',
                position: 'relative',
                zIndex: 2,
                border: '1px solid #FFCDD2',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🌿 Eggless</span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🎉 Custom Theme</span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🕯️ 1 Candle</span>
              <span style={{ color: '#FFCDD2' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🎁 Special Care</span>
            </div>

            {/* Bottom Thank You section */}
            <div
              style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 2,
                borderTop: '1px dashed rgba(181, 96, 106, 0.15)',
                paddingTop: 12,
              }}
            >
              {/* Left and right gold sparkles */}
              <div
                style={{ position: 'absolute', left: 20, top: 12, color: '#FFE082', fontSize: 14 }}
              >
                ✨
              </div>
              <div
                style={{ position: 'absolute', right: 20, top: 12, color: '#FFE082', fontSize: 14 }}
              >
                ✨
              </div>

              <div
                style={{
                  color: '#E38A95',
                  fontSize: 20,
                  fontWeight: 'normal',
                  fontFamily: '"Playball", cursive',
                }}
              >
                Thank you! <span style={{ color: '#E38A95' }}>❤️</span>
              </div>
              <div
                style={{
                  color: '#9E8E85',
                  fontSize: 14,
                  fontWeight: 'normal',
                  fontFamily: '"Playball", cursive',
                  fontStyle: 'italic',
                  marginTop: 2,
                }}
              >
                Thank you for choosing
              </div>
              <div
                style={{
                  color: '#4A3B32',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 20,
                  fontWeight: 900,
                  marginTop: 2,
                  letterSpacing: '0.02em',
                }}
              >
                {business?.name || 'Cream & Crust Bakery'}{' '}
                <span style={{ color: '#E38A95' }}>❤️</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    color: '#F5C6C6',
                    fontSize: '11px',
                    transform: 'scaleX(-1)',
                    display: 'inline-block',
                  }}
                >
                  🌿
                </span>
                <span style={{ color: '#D47A85', fontSize: '13px' }}>❤️</span>
                <span style={{ color: '#F5C6C6', fontSize: '11px' }}>🌿</span>
              </div>

              {/* Watermark text requested by user */}
              <div
                style={{
                  fontSize: '8px',
                  color: 'rgba(158, 142, 133, 0.5)',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 14,
                }}
              >
                Generated via Cream & Crust ERP App
              </div>
            </div>
          </div>
        </div>

        {/* Real Active Utility UI Buttons (Invisible to canvas screenshot capture) */}
        <div
          data-html2canvas-ignore="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 16,
            width: '100%',
            maxWidth: 380,
          }}
        >
          {/* Task 3.8 — Deduction Summary Panel */}
          {(o.deductionSummary || o.deductionError) && (
            <div
              style={{
                background: o.deductionError ? 'rgba(211,47,47,0.06)' : 'rgba(46,122,90,0.07)',
                border: `1px solid ${o.deductionError ? 'rgba(211,47,47,0.18)' : 'rgba(46,122,90,0.18)'}`,
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: o.deductionError ? '#D32F2F' : '#2E7A5A',
                  marginBottom: 8,
                }}
              >
                {o.deductionError ? '⚠️ Stock Deduction Failed' : '📦 Ingredients Auto-Deducted'}
              </div>
              {o.deductionError && (
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: '#C62828',
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {o.deductionError.message || 'Unknown error'}
                </div>
              )}
              {Array.isArray(o.deductionSummary) &&
                o.deductionSummary.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#2E7A5A',
                      paddingTop: 4,
                      borderTop: i > 0 ? '1px solid rgba(46,122,90,0.1)' : 'none',
                    }}
                  >
                    <span>{item.ingredient}</span>
                    <span style={{ fontWeight: 800 }}>
                      −{item.deducted} {item.unit}
                    </span>
                  </div>
                ))}
              {o.restockedForOrder && (
                <div
                  style={{ fontSize: '0.7rem', color: '#1565C0', fontWeight: 800, marginTop: 6 }}
                >
                  ♻️ Restocked (order cancelled)
                </div>
              )}
            </div>
          )}

          {/* ── Primary action — Share on WhatsApp ── */}
          <button
            onClick={() => handleWhatsApp(o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              background: 'linear-gradient(135deg, #25D366 0%, #1EBE5A 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 16px',
              borderRadius: 16,
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(37,211,102,0.32), inset 0 1px 0 rgba(255,255,255,0.2)',
              letterSpacing: '-0.01em',
              width: '100%',
            }}
          >
            <MessageCircle size={19} strokeWidth={2.4} /> Share Order on WhatsApp
            <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
          </button>

          {/* Security badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              fontSize: 11,
              color: '#8C7A6B',
              fontWeight: 600,
            }}
          >
            🔒 Secure · Encrypted · No data shared with third parties
          </div>

          {/* ── 2x2 Action Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={async () => {
                try {
                  showToast('Preparing customer invoice PDF...', 'info');
                  const result = await downloadInvoicePdf(o, business);
                  o.invoiceGeneratedAt = result.generatedAt;
                  showToast(`Invoice downloaded: ${result.fileName}`, 'success');
                } catch (err) {
                  console.error(err);
                  showToast('Failed to generate invoice', 'error');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 12px',
                borderRadius: 14,
                border: '1px solid rgba(181,96,106,0.12)',
                background: '#FFFDFB',
                color: '#2D1B14',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(181,96,106,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#B5606A',
                  flexShrink: 0,
                }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Generate Invoice</div>
                <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 1 }}>Download invoice</div>
              </div>
            </button>

            <button
              onClick={async () => {
                const cName =
                  typeof o.customer === 'object'
                    ? o.customer?.name || 'Customer'
                    : o.customerName || o.customer || 'Customer';
                const phone = typeof o.customer === 'object' ? o.customer?.phone : o.phone;
                try {
                  showToast('Preparing shareable invoice PDF...', 'info');
                  const result = await shareInvoicePdf(o, business);
                  o.invoiceGeneratedAt = result.generatedAt;
                  if (result.shared) {
                    showToast('Invoice shared!', 'success');
                    return;
                  }
                  const msg = `Hi ${cName},\nThank you for ordering from ${business?.name || 'Cream & Crust'}.\nYour invoice is ready.`;
                  window.open(
                    `https://wa.me/91${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
                    '_blank'
                  );
                  showToast('PDF downloaded. Attach in WhatsApp.', 'info', 3500);
                } catch (err) {
                  showToast('Failed to share invoice', 'error');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 12px',
                borderRadius: 14,
                border: '1px solid rgba(181,96,106,0.12)',
                background: '#FFFDFB',
                color: '#2D1B14',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(232,106,140,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E86A8C',
                  flexShrink: 0,
                }}
              >
                <MessageCircle size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Share Invoice</div>
                <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 1 }}>Send to customer</div>
              </div>
            </button>

            <button
              onClick={() => handleRapidoBooking(o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 12px',
                borderRadius: 14,
                border: '1px solid rgba(181,96,106,0.12)',
                background: '#FFFDFB',
                color: '#2D1B14',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F59E0B',
                  flexShrink: 0,
                }}
              >
                <Truck size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Book Rapido</div>
                <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 1 }}>Fast delivery</div>
              </div>
            </button>

            <button
              onClick={handleDownloadCard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 12px',
                borderRadius: 14,
                border: '1px solid rgba(181,96,106,0.12)',
                background: '#FFFDFB',
                color: '#2D1B14',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366F1',
                  flexShrink: 0,
                }}
              >
                <Download size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Save Card</div>
                <div style={{ fontSize: 11, color: '#8C7A6B', marginTop: 1 }}>Save as image</div>
              </div>
            </button>
          </div>

          {/* ── Close ── */}
          <button
            onClick={() => setGeneratedOrderCard(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              border: '1.5px solid rgba(181,96,106,0.12)',
              background: '#FFFDFB',
              color: '#B5606A',
              padding: '14px',
              borderRadius: 14,
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            📋 Close Card & Show All Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      initial="hidden"
      animate="show"
    >
      {/* Page Header */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Orders
          </h1>
          <p
            style={{
              color: 'var(--text3)',
              fontSize: '0.78rem',
              marginTop: 2,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Track every celebration beautifully ✨
          </p>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile Header Search Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowHeaderSearch(!showHeaderSearch);
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid rgba(74, 59, 50, 0.04)',
              boxShadow: '0 2px 8px rgba(74,59,50,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showHeaderSearch ? 'var(--accent)' : 'var(--text2)',
            }}
          >
            <Search size={18} strokeWidth={2.5} />
          </button>

          {/* Settings / Filter Slider */}
          <button
            onClick={() => {
              triggerHaptic('light');
              showToast('Filters panel opened', 'info');
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'white',
              border: '1px solid rgba(74, 59, 50, 0.04)',
              boxShadow: '0 2px 8px rgba(74,59,50,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text2)',
            }}
          >
            <SlidersHorizontal size={17} strokeWidth={2.5} />
          </button>

          {/* New Order — primary CTA on mobile (always visible) */}
          <button
            className="mobile-only"
            onClick={() => {
              triggerHaptic('light');
              setForm(emptyForm);
              setShowModal(true);
            }}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 18,
              background: 'linear-gradient(135deg, var(--accent) 0%, #C87A82 100%)',
              color: '#fff',
              border: 'none',
              boxShadow:
                '0 6px 16px rgba(181, 96, 106, 0.30), inset 0 1px 0 rgba(255,255,255,0.18)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '-0.01em',
            }}
            aria-label="New order"
          >
            <Plus size={16} strokeWidth={2.6} /> New
          </button>

          <button
            className="btn btn-outline desktop-only"
            onClick={() => exportToCSV(orders, 'orders_export')}
            style={{ borderRadius: 12, height: 40 }}
          >
            <Download size={18} /> Export
          </button>

          <button
            className="btn btn-primary desktop-only"
            onClick={() => {
              setForm(emptyForm);
              setShowModal(true);
            }}
            style={{ borderRadius: 12, height: 40 }}
          >
            <Plus size={18} /> New Order
          </button>
        </div>
      </div>

      {/* Dynamic Inline Search Container */}
      <AnimatePresence>
        {showHeaderSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--accent)',
                }}
              />
              <input
                placeholder="Search orders, clients, flavors…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{
                  paddingLeft: 40,
                  borderRadius: 16,
                  border: '1px solid rgba(74, 59, 50, 0.08)',
                  background: 'white',
                  height: 40,
                  fontSize: '0.86rem',
                }}
              />
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2x2 Metrics Grid (Responsive: 2x2 on Mobile, 1x4 on Desktop) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {statsData.map((stat, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: 20,
              padding: 16,
              border: '1px solid rgba(74, 59, 50, 0.05)',
              boxShadow: 'var(--shadow-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: stat.bg,
                color: stat.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <stat.icon size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: 'var(--text)',
                  marginTop: 2,
                  letterSpacing: '-0.02em',
                }}
              >
                {typeof stat.value === 'number' ? (
                  <AnimatedNumber value={stat.value} duration={0.9} />
                ) : (
                  stat.value
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Closeable Swipe Actions Banner */}
      <AnimatePresence>
        {showSwipeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: '#FFF5EC',
                border: '1px solid rgba(181, 96, 106, 0.12)',
                borderRadius: 20,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(181,96,106,0.01)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '18px' }}>👉</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text2)' }}>
                  Swipe right for quick actions. WhatsApp, Rapido, Invoice & more
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowSwipeBanner(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Pipeline Node Progress Tracker */}
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '20px 16px',
          border: '1px solid rgba(74, 59, 50, 0.05)',
          boxShadow: 'var(--shadow-xs)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Clock size={13} color="var(--accent)" /> Order Pipeline Stages
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Connector Line behind nodes */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: '8%',
              right: '8%',
              height: 2,
              background: 'rgba(74, 59, 50, 0.06)',
              zIndex: 1,
            }}
          />

          {statusFlow.map((step, idx) => {
            const count = pipelineCounts[step] || 0;
            const isCurrentFilter = filter === step;
            const hasOrders = count > 0;

            let nodeBg = 'white';
            let nodeBorder = '2px solid rgba(74, 59, 50, 0.08)';
            let textColor = 'var(--text3)';

            if (isCurrentFilter) {
              nodeBg = 'var(--accent)';
              nodeBorder = '2px solid var(--accent)';
              textColor = 'var(--accent)';
            } else if (hasOrders) {
              nodeBg = 'var(--cream)';
              nodeBorder = '2px solid #E8B4BB'; // peach border
              textColor = 'var(--text)';
            }

            return (
              <div
                key={step}
                onClick={() => {
                  triggerHaptic('light');
                  setFilter(isCurrentFilter ? 'all' : step);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  zIndex: 2,
                  position: 'relative',
                }}
              >
                {/* Node Circle */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: nodeBg,
                    border: nodeBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    boxShadow: isCurrentFilter ? '0 4px 12px rgba(181, 96, 106, 0.25)' : 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  {/* Count Badge inside node */}
                  <span
                    style={{
                      color: isCurrentFilter
                        ? 'white'
                        : hasOrders
                          ? 'var(--accent)'
                          : 'rgba(74, 59, 50, 0.4)',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                    }}
                  >
                    {count}
                  </span>
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: isCurrentFilter || hasOrders ? 800 : 700,
                    color: isCurrentFilter
                      ? 'var(--accent)'
                      : hasOrders
                        ? 'var(--text)'
                        : 'var(--text3)',
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    textAlign: 'center',
                  }}
                >
                  {step === 'inquiry'
                    ? 'Inquiry'
                    : step === 'confirmed'
                      ? 'Confirm'
                      : step === 'baking'
                        ? 'Bake'
                        : step === 'ready'
                          ? 'Ready'
                          : 'Deliver'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* View Mode Toggle Switch */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: '0.86rem',
            fontWeight: 800,
            color: 'var(--text2)',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}
        >
          {viewMode === 'list' ? 'Order Directory' : 'Delivery Calendar'}
        </div>
        <div
          style={{
            background: 'rgba(74, 59, 50, 0.04)',
            padding: 3,
            borderRadius: 12,
            display: 'inline-flex',
            gap: 4,
          }}
        >
          <button
            onClick={() => {
              triggerHaptic('light');
              setViewMode('list');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 9,
              fontSize: '0.76rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'list' ? 'white' : 'transparent',
              color: viewMode === 'list' ? 'var(--text)' : 'var(--text3)',
              boxShadow: viewMode === 'list' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: '0.15s',
            }}
          >
            📋 List
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setViewMode('calendar');
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 9,
              fontSize: '0.76rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'calendar' ? 'white' : 'transparent',
              color: viewMode === 'calendar' ? 'var(--text)' : 'var(--text3)',
              boxShadow: viewMode === 'calendar' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: '0.15s',
            }}
          >
            📅 Calendar
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: searchFocused ? 'var(--accent)' : 'var(--text3)',
            }}
          />
          <input
            placeholder="Search orders, customers, products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              paddingLeft: 42,
              borderRadius: 16,
              border: '1px solid rgba(74, 59, 50, 0.08)',
              background: 'white',
              height: 44,
              fontSize: '0.9rem',
            }}
          />
        </div>

        {/* Scrolling Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 8,
            margin: '0 -16px',
            paddingLeft: 16,
            paddingRight: 16,
          }}
          className="hide-scrollbar"
        >
          {segOptions.map((opt) => {
            const isActive = filter === opt.value;
            const count =
              opt.value === 'all'
                ? orders.length
                : orders.filter((o) => String(o.status || 'inquiry').toLowerCase() === opt.value)
                    .length;

            return (
              <button
                key={opt.value}
                onClick={() => {
                  triggerHaptic('light');
                  setFilter(opt.value);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 99,
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: isActive ? 'var(--accent)' : 'white',
                  color: isActive ? 'white' : 'var(--text2)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid rgba(74, 59, 50, 0.06)',
                  boxShadow: isActive
                    ? '0 4px 12px rgba(181, 96, 106, 0.15)'
                    : '0 2px 4px rgba(74, 59, 50, 0.01)',
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Payment filter toggle */}
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[
            { value: 'all', label: 'All Payments' },
            { value: 'pending', label: '💰 Pending' },
            { value: 'paid', label: '✅ Paid' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                triggerHaptic('light');
                setPaymentFilter(opt.value);
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background:
                  paymentFilter === opt.value
                    ? opt.value === 'pending'
                      ? '#FEF3C7'
                      : opt.value === 'paid'
                        ? '#D1FAE5'
                        : 'var(--bg)'
                    : 'transparent',
                color:
                  paymentFilter === opt.value
                    ? opt.value === 'pending'
                      ? '#92400E'
                      : opt.value === 'paid'
                        ? '#065F46'
                        : 'var(--text)'
                    : 'var(--text3)',
                border:
                  paymentFilter === opt.value
                    ? opt.value === 'pending'
                      ? '1px solid #F59E0B'
                      : opt.value === 'paid'
                        ? '1px solid #10B981'
                        : '1px solid var(--border)'
                    : '1px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          orders={filtered}
          onOrderClick={setGeneratedOrderCard}
          onWhatsApp={handleWhatsApp}
          onCustomerClick={openCustomerProfile}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div
            className="card desktop-only"
            style={{
              padding: 0,
              overflow: 'hidden',
              borderRadius: 24,
              border: '1px solid rgba(74, 59, 50, 0.05)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {loading ? (
              <div
                style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                {[...Array(5)].map((_, i) => (
                  <OrderRowSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '64px 32px',
                  textAlign: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '3.5rem',
                    marginBottom: 16,
                    display: 'inline-block',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
                  }}
                >
                  🎂
                </span>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginBottom: 8,
                    letterSpacing: '-0.02em',
                  }}
                >
                  No orders yet
                </h2>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--text3)',
                    maxWidth: 320,
                    lineHeight: 1.6,
                    marginBottom: 24,
                    fontWeight: 500,
                  }}
                >
                  Start tracking celebrations beautifully. Create your first order manually or load
                  a complete set of mock orders instantly.
                </p>
                <div
                  style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
                >
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowModal(true)}
                    style={{
                      padding: '12px 24px',
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: 14,
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(181,96,106,0.2)',
                    }}
                  >
                    + New Order
                  </motion.button>
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Delivery</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => (
                      <OrderRow
                        key={o.id}
                        o={o}
                        allOrders={orders}
                        onAdvance={updateStatus}
                        onWhatsApp={handleWhatsApp}
                        onRapido={handleRapidoBooking}
                        onCustomerClick={openCustomerProfile}
                        onOrderClick={setGeneratedOrderCard}
                        onEdit={openEditOrder}
                        onDelete={handleDeleteOrder}
                        onTogglePayment={togglePayment}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="mobile-only">
            {loading ? (
              [...Array(4)].map((_, i) => <OrderRowSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 20px',
                  textAlign: 'center',
                  background: 'white',
                  borderRadius: 24,
                  border: '1px solid rgba(74, 59, 50, 0.04)',
                  boxShadow: '0 4px 16px rgba(74,59,50,0.012)',
                }}
              >
                <span
                  style={{
                    fontSize: '3rem',
                    marginBottom: 12,
                    display: 'inline-block',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
                  }}
                >
                  🎂
                </span>
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text)',
                    marginBottom: 6,
                    letterSpacing: '-0.02em',
                  }}
                >
                  No orders yet
                </h2>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text3)',
                    maxWidth: 260,
                    lineHeight: 1.5,
                    marginBottom: 20,
                    fontWeight: 500,
                  }}
                >
                  Add orders manually or tap below to seed your workspace with live demo orders.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    width: '100%',
                    maxWidth: 240,
                  }}
                >
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowModal(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--accent)',
                      color: 'white',
                      borderRadius: 14,
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(181,96,106,0.15)',
                    }}
                  >
                    + New Order
                  </motion.button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {filtered.map((o) => (
                  <MobileOrderCard
                    key={o.id}
                    o={o}
                    allOrders={orders}
                    onAdvance={updateStatus}
                    onWhatsApp={handleWhatsApp}
                    onRapido={handleRapidoBooking}
                    onCustomerClick={openCustomerProfile}
                    onOrderClick={setGeneratedOrderCard}
                    onEdit={openEditOrder}
                    onDelete={handleDeleteOrder}
                    onTogglePayment={togglePayment}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <div
            className="modal-overlay desktop-only"
            onClick={() => {
              setShowModal(false);
              setEditingOrderId(null);
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 22,
                }}
              >
                <h2>{editingOrderId ? 'Edit Order' : 'New Order'}</h2>
                <button
                  className="btn-icon"
                  onClick={() => {
                    setShowModal(false);
                    setEditingOrderId(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <OrderForm
                form={form}
                setForm={setForm}
                onSubmit={addOrder}
                editingOrderId={editingOrderId}
                savedCategories={savedCategories}
                setSavedCategories={setSavedCategories}
                currentUser={currentUser}
                showToast={showToast}
                hasOrders={orders.length > 0}
                recipeList={recipeList}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mobile-only">
        <BottomSheet
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingOrderId(null);
          }}
          title={editingOrderId ? 'Edit Order' : 'New Order'}
        >
          <OrderForm
            form={form}
            setForm={setForm}
            onSubmit={addOrder}
            editingOrderId={editingOrderId}
            savedCategories={savedCategories}
            setSavedCategories={setSavedCategories}
            currentUser={currentUser}
            showToast={showToast}
            hasOrders={orders.length > 0}
            recipeList={recipeList}
          />
        </BottomSheet>
      </div>

      <CustomerProfileSheet
        open={Boolean(selectedCustomerProfile)}
        onClose={() => setSelectedCustomerProfile(null)}
        customer={selectedCustomerProfile}
        orders={orders}
        onRepeatOrder={repeatOrder}
      />

      <StatusUpdateModal
        open={Boolean(statusUpdate)}
        onClose={() => setStatusUpdate(null)}
        status={statusUpdate?.status}
        customerName={statusUpdate?.customerName}
        phone={statusUpdate?.phone}
        message={statusUpdate?.message}
      />
      <AnimatedDemo moduleId="orders" title="How to Create an Order" scenes={ordersDemoScenes} />
    </motion.div>
  );
}
