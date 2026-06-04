import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  LogOut,
  Camera,
  Edit2,
  X,
  Check,
  Copy,
  Lock,
  Bell,
  Link2,
  Sparkles,
  Briefcase,
  Instagram,
  MessageCircle,
  Globe,
  CreditCard,
  FileText,
  Truck,
  ShoppingBag,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Lock as LockIcon,
  Sliders,
  Upload,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToOrders, subscribeToBusiness, updateBusinessInDB } from '../services/db';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useRef, useMemo } from 'react';
import { showToast } from '../components/iOS';
import { BUSINESS_FIELDS, calculateProfileCompleteness } from '../utils/profileFields';
import PremiumBadge from '../components/PremiumBadge';
import { useSubscription } from '../hooks/useSubscription';

/* ─────────────────────────────────────────────
   Field metadata
   ───────────────────────────────────────────── */
const FIELD_ICONS = {
  name: ShoppingBag,
  ownerName: UserIcon,
  phone: Phone,
  email: Mail,
  tagline: Sparkles,
  businessType: Briefcase,
  instagram: Instagram,
  whatsapp: MessageCircle,
  website: Globe,
  pickupAddress: MapPin,
  city: MapPin,
  deliveryAreas: Truck,
  upiId: CreditCard,
  gstNumber: FileText,
};

const FIELD_PLACEHOLDERS = {
  name: 'e.g. Cream & Crust',
  ownerName: 'Your full name',
  tagline: 'A short, memorable line',
  city: 'e.g. Mumbai',
  deliveryAreas: 'Andheri, Bandra, Juhu',
  pickupAddress: 'Full pickup address',
  instagram: 'username (without @)',
  website: 'https://yourbakery.com',
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
  upiId: 'yourname@upi',
  gstNumber: '22AAAAA0000A1Z5',
};

const FIELD_GROUPS = [
  {
    title: 'Bakery identity',
    description: 'How customers see your brand',
    keys: ['name', 'tagline', 'businessType'],
  },
  {
    title: 'Contact',
    description: 'Owner and reach-out details',
    keys: ['ownerName', 'phone', 'email'],
  },
  {
    title: 'Online presence',
    description: 'Social and web links',
    keys: ['instagram', 'whatsapp', 'website'],
  },
  {
    title: 'Location & delivery',
    description: 'Where you bake and serve',
    keys: ['pickupAddress', 'city', 'deliveryAreas'],
  },
  {
    title: 'Payments & compliance',
    description: 'Billing and tax information',
    keys: ['upiId', 'gstNumber'],
  },
];

const BUSINESS_TYPES = ['Home Baker', 'Bakery', 'Cafe', 'Cloud Kitchen', 'Catering', 'Other'];

// All fields that can be edited from the form. `email` stays read-only (tied to auth).
const EDITABLE_KEYS = new Set([
  'name',
  'ownerName',
  'tagline',
  'businessType',
  'city',
  'deliveryAreas',
  'pickupAddress',
  'phone',
  'instagram',
  'whatsapp',
  'website',
  'upiId',
  'gstNumber',
]);

export default function Profile() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [orderCount, setOrderCount] = useState(0);
  const [business, setBusiness] = useState({ name: 'Cream & Crust', logo: '🧁', id: null });
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const { isActive: subscriptionActive } = useSubscription();

  // Edit-mode state for each editable field
  const [editName, setEditName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editBusinessType, setEditBusinessType] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDeliveryAreas, setEditDeliveryAreas] = useState('');
  const [editPickupAddress, setEditPickupAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editUpiId, setEditUpiId] = useState('');
  const [editGstNumber, setEditGstNumber] = useState('');

  const [userDoc, setUserDoc] = useState({
    name: '',
    phone: '',
    address: 'India',
    bio: '',
    instagram: '',
    whatsapp: '',
    website: '',
    gstin: '',
    upiId: '',
    invoiceTagline: 'Baking memories, one slice at a time!',
    terms: 'Orders confirmed only after 50% advance.',
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [changingPass, setChangingPass] = useState(false);
  // Account deletion flow
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 reason → 2 confirm → 3 reauth
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteDetail, setDeleteDetail] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchUser = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) {
          setUserDoc({
            name: uDoc.data().name || currentUser.displayName || 'Baker',
            phone: uDoc.data().phone || currentUser.phoneNumber || '',
            address: uDoc.data().address || 'India',
            photoURL: uDoc.data().photoURL || '',
            bio: uDoc.data().bio || '',
            instagram: uDoc.data().instagram || '',
            whatsapp: uDoc.data().whatsapp || '',
            website: uDoc.data().website || '',
            gstin: uDoc.data().gstin || '',
            upiId: uDoc.data().upiId || '',
            invoiceTagline: uDoc.data().invoiceTagline || 'Baking memories, one slice at a time!',
            terms: uDoc.data().terms || 'Orders confirmed only after 50% advance.',
            notifications: uDoc.data().notifications || {
              email: true,
              orders: true,
              whatsapp: false,
            },
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();

    const userIdFilter = userRole === 'customer' ? currentUser?.uid : null;
    const unsubOrders = subscribeToOrders((orders) => setOrderCount(orders.length), userIdFilter);

    let unsubBiz = () => {};
    if (userRole !== 'customer') {
      unsubBiz = subscribeToBusiness((biz) => setBusiness(biz), null, currentUser.uid);
    }

    return () => {
      unsubOrders();
      unsubBiz();
    };
  }, [userRole, currentUser]);


  const normalizeDeliveryAreas = (areas) => {
    if (Array.isArray(areas)) return areas;
    if (typeof areas === 'string' && areas.trim()) {
      return areas
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    }
    return [];
  };

  const enterEditMode = () => {
    setEditName(business.name || '');
    setEditOwnerName(business.ownerName || userDoc.name || '');
    setEditTagline(business.tagline || '');
    setEditBusinessType(business.businessType || '');
    setEditCity(business.city || '');
    setEditDeliveryAreas(normalizeDeliveryAreas(business.deliveryAreas).join(', '));
    setEditPickupAddress(business.pickupAddress || userDoc.address || '');
    setEditPhone(business.phone || userDoc.phone || '');
    setEditInstagram(business.instagram || userDoc.instagram || '');
    setEditWhatsapp(business.whatsapp || userDoc.whatsapp || '');
    setEditWebsite(business.website || userDoc.website || '');
    setEditUpiId(business.upiId || userDoc.upiId || '');
    setEditGstNumber(business.gstNumber || userDoc.gstin || '');
    setEditingDetails(true);
  };

  const handleUpdateDetails = async () => {
    setSavingDetails(true);
    try {
      const deliveryAreasArray = editDeliveryAreas
        ? editDeliveryAreas
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [];

      if (userRole === 'customer') {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: editOwnerName || userDoc.name,
          phone: editPhone,
          address: editPickupAddress,
          instagram: editInstagram,
          whatsapp: editWhatsapp,
          website: editWebsite,
          gstin: editGstNumber,
          notifications: userDoc.notifications,
        });
        setUserDoc((prev) => ({
          ...prev,
          name: editOwnerName || prev.name,
          phone: editPhone,
          address: editPickupAddress,
          instagram: editInstagram,
          whatsapp: editWhatsapp,
          website: editWebsite,
          gstin: editGstNumber,
        }));
      } else {
        await updateBusinessInDB(business.id, {
          name: editName || business.name,
          ownerName: editOwnerName,
          tagline: editTagline,
          businessType: editBusinessType,
          phone: editPhone,
          instagram: editInstagram,
          whatsapp: editWhatsapp,
          website: editWebsite,
          pickupAddress: editPickupAddress,
          city: editCity,
          deliveryAreas: deliveryAreasArray,
          upiId: editUpiId,
          gstNumber: editGstNumber,
          username: business.username,
        });
        // Mirror common fields back to user doc
        await updateDoc(doc(db, 'users', currentUser.uid), {
          name: editOwnerName || userDoc.name,
          phone: editPhone,
          address: editPickupAddress,
          instagram: editInstagram,
          whatsapp: editWhatsapp,
          website: editWebsite,
          gstin: editGstNumber,
          upiId: editUpiId,
        });
      }
      setEditingDetails(false);
      showToast('Profile updated', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  const completeness = calculateProfileCompleteness(business);

  const completenessMessage = useMemo(() => {
    if (completeness >= 100) return 'Your profile looks great';
    if (completeness >= 75) return 'Almost there — a few details left';
    if (completeness >= 40) return 'Halfway done. Keep going.';
    return 'Add a few details to get started';
  }, [completeness]);

  const getDisplayValue = (key) => {
    const businessData = business;
    const map = {
      name: businessData.name,
      ownerName: businessData.ownerName || userDoc.name,
      phone: businessData.phone || userDoc.phone,
      email: currentUser?.email,
      tagline: businessData.tagline,
      businessType: businessData.businessType,
      instagram: businessData.instagram || userDoc.instagram,
      whatsapp: businessData.whatsapp || userDoc.whatsapp,
      website: businessData.website || userDoc.website,
      pickupAddress: businessData.pickupAddress || userDoc.address,
      city: businessData.city,
      deliveryAreas: normalizeDeliveryAreas(businessData.deliveryAreas),
      upiId: businessData.upiId || userDoc.upiId,
      gstNumber: businessData.gstNumber || userDoc.gstin,
    };
    const value = map[key];
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '';
    return value && String(value).trim() ? String(value).trim() : '';
  };

  const getEditValueAndSetter = (key) => {
    switch (key) {
      case 'name':
        return [editName, setEditName];
      case 'ownerName':
        return [editOwnerName, setEditOwnerName];
      case 'tagline':
        return [editTagline, setEditTagline];
      case 'businessType':
        return [editBusinessType, setEditBusinessType];
      case 'city':
        return [editCity, setEditCity];
      case 'deliveryAreas':
        return [editDeliveryAreas, setEditDeliveryAreas];
      case 'pickupAddress':
        return [editPickupAddress, setEditPickupAddress];
      case 'phone':
        return [editPhone, setEditPhone];
      case 'instagram':
        return [editInstagram, setEditInstagram];
      case 'whatsapp':
        return [editWhatsapp, setEditWhatsapp];
      case 'website':
        return [editWebsite, setEditWebsite];
      case 'upiId':
        return [editUpiId, setEditUpiId];
      case 'gstNumber':
        return [editGstNumber, setEditGstNumber];
      default:
        return [null, null];
    }
  };

  const isBakerOrAdmin = userRole === 'admin' || userRole === 'baker';
  const fileInputRef = useRef(null);
  const qrFileInputRef = useRef(null);

  // Local mirror of the uploaded UPI QR so the UI updates instantly
  // after a save / remove (the business snapshot listener catches up
  // shortly after).
  const [localUpiQr, setLocalUpiQr] = useState('');
  useEffect(() => {
    setLocalUpiQr(business?.upiQrUrl || business?.upiQr || '');
  }, [business?.upiQrUrl, business?.upiQr]);

  /**
   * Upload a UPI QR image. Resized to max 480px on the longest edge
   * so it stays under Firestore field size limits while keeping enough
   * detail for a scanner to lock on. The QR is saved as a JPEG data
   * URL on the bakery profile under `upiQrUrl`, where the invoice
   * template will pick it up automatically.
   */
  const handleUpiQrUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!business?.id) {
      showToast('Bakery profile is loading. Try again in a second.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX = 480;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // White background — protects QR scanability if the source
        // image happens to have transparency.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        try {
          await updateBusinessInDB(business.id, { upiQrUrl: dataUrl });
          setLocalUpiQr(dataUrl);
          showToast('UPI QR uploaded — invoices will use it now', 'success');
        } catch (error) {
          console.error('UPI QR upload error:', error);
          showToast(`Failed: ${error.message || 'Unknown error'}`, 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleUpiQrRemove = async () => {
    if (!business?.id) return;
    try {
      await updateBusinessInDB(business.id, { upiQrUrl: '' });
      setLocalUpiQr('');
      showToast('UPI QR removed — invoices will use the auto-generated one', 'info');
    } catch (error) {
      console.error('UPI QR remove error:', error);
      showToast(`Failed: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          if (userRole === 'customer') {
            await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: dataUrl });
            setUserDoc((prev) => ({ ...prev, photoURL: dataUrl }));
            showToast('Profile photo updated', 'success');
          } else {
            await updateBusinessInDB(business.id, { logo: dataUrl });
            showToast('Bakery logo updated', 'success');
          }
        } catch (error) {
          console.error('Upload error:', error);
          showToast(`Failed: ${error.message || 'Unknown error'}`, 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  /* ─────────────────────────────────────────────
     Reusable subcomponents
     ───────────────────────────────────────────── */
  const SectionHeader = ({ icon: Icon, iconBg, iconColor, title, description, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );

  /* ─────────────────────────────────────────────
     Render: Hero card
     ───────────────────────────────────────────── */
  const renderHeroCard = () => {
    const displayName = userRole === 'customer' ? userDoc.name : business.name;
    const tagline = business.tagline;

    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        {/* Soft gradient banner with floating bakery elements */}
        <div
          style={{
            height: 110,
            background:
              'linear-gradient(135deg, #B5606A 0%, #C97A82 40%, #E8B4BB 80%, #F6D9C4 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 25% 40%, rgba(255,255,255,0.20) 0%, transparent 50%),' +
                'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12) 0%, transparent 50%)',
            }}
          />
          {/* Floating bakery elements */}
          {[
            { e: '\u{1F9C1}', top: 16, right: 24, size: 30, d: 0 },
            { e: '\u{1F382}', top: 50, right: 70, size: 22, d: 0.5 },
            { e: '\u2728', top: 22, right: 120, size: 16, d: 0.3 },
          ].map((f, i) => (
            <motion.div
              key={i}
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.92, scale: 1, y: [0, -8, 0], rotate: [0, 6, -4, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: f.d },
                scale: { duration: 0.5, delay: f.d },
                y: { duration: 4 + f.d, repeat: Infinity, ease: 'easeInOut' },
                rotate: { duration: 6 + f.d, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{
                position: 'absolute',
                top: f.top,
                right: f.right,
                fontSize: f.size,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {f.e}
            </motion.div>
          ))}
        </div>

        <div style={{ padding: '0 26px 24px', marginTop: -42, position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                fontWeight: 700,
                border: '4px solid var(--card)',
                boxShadow: '0 10px 24px rgba(74,59,50,0.18)',
                overflow: 'hidden',
              }}
            >
              {userRole === 'customer' ? (
                userDoc.photoURL ? (
                  <img
                    src={userDoc.photoURL}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  currentUser?.displayName?.[0]?.toUpperCase() || '👤'
                )
              ) : business.logo && business.logo.startsWith('data:image') ? (
                <img
                  src={business.logo}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <img
                  src="/logo.png"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change photo"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--card)',
                border: '1px solid var(--border-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text2)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <Camera size={13} />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Name */}
          <h2
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {displayName}
            {subscriptionActive && <PremiumBadge size="sm" />}
          </h2>

          {/* Tagline */}
          {tagline ? (
            <p
              style={{ margin: '6px 0 0', color: 'var(--text2)', fontSize: 13.5, lineHeight: 1.5 }}
            >
              {tagline}
            </p>
          ) : isBakerOrAdmin ? (
            <p
              style={{
                margin: '6px 0 0',
                color: 'var(--text3)',
                fontSize: 13,
                fontStyle: 'italic',
              }}
            >
              Add a tagline to bring your brand to life
            </p>
          ) : null}

          {/* Meta chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {isBakerOrAdmin && (
              <span
                style={{
                  ...chipStyle,
                  background: 'var(--accent-lt)',
                  color: 'var(--accent)',
                  border: 'none',
                }}
              >
                <Shield size={11} /> Baker
              </span>
            )}
            {business.businessType && (
              <span style={chipStyle}>
                <Briefcase size={11} /> {business.businessType}
              </span>
            )}
            {business.city && (
              <span style={chipStyle}>
                <MapPin size={11} /> {business.city}
              </span>
            )}
          </div>

          {/* Completeness */}
          <div
            style={{
              marginTop: 22,
              padding: '14px 16px',
              background: 'var(--bg)',
              borderRadius: 14,
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  color: 'var(--text2)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Profile complete
              </span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {completeness}
                <span
                  style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginLeft: 1 }}
                >
                  %
                </span>
              </span>
            </div>
            <div
              style={{
                height: 5,
                background: 'var(--border-md)',
                borderRadius: 99,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completeness}%` }}
                transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                  borderRadius: 99,
                }}
              />
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>{completenessMessage}</span>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Stats
     ───────────────────────────────────────────── */
  const renderQuickStats = () => {
    const stats = [
      { label: 'Orders', value: orderCount.toString(), icon: ShoppingBag },
      {
        label: 'Joined',
        value: currentUser?.metadata?.creationTime
          ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })
          : 'Recently',
        icon: Calendar,
      },
      {
        label: 'Status',
        value: completeness >= 100 ? 'Active' : 'Setup',
        icon: Shield,
      },
    ];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              padding: '14px 14px 12px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <s.icon size={15} style={{ color: 'var(--text3)', marginBottom: 8 }} />
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--text3)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 3,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Field row
     ───────────────────────────────────────────── */
  const renderFieldRow = (key, isLast) => {
    const Icon = FIELD_ICONS[key] || Edit2;
    const fieldDef = BUSINESS_FIELDS.find((f) => f.key === key);
    const label = fieldDef?.label || key;
    const isRequired = fieldDef?.required;
    const value = getDisplayValue(key);
    const editable = EDITABLE_KEYS.has(key);

    if (editingDetails && editable) {
      const [editValue, setEditValue] = getEditValueAndSetter(key);

      return (
        <div
          key={key}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr',
            columnGap: 14,
            alignItems: 'flex-start',
            padding: '12px 0',
            borderBottom: isLast ? 'none' : '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--bg)',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 22,
            }}
          >
            <Icon size={14} />
          </div>
          <div style={{ minWidth: 0 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--text2)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                marginBottom: 6,
              }}
            >
              {label}
              {isRequired && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
            </label>
            {key === 'businessType' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10 }}
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={key === 'phone' || key === 'whatsapp' ? 'tel' : 'text'}
                inputMode={key === 'phone' || key === 'whatsapp' ? 'numeric' : undefined}
                value={editValue ?? ''}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder={FIELD_PLACEHOLDERS[key] || `Enter ${label.toLowerCase()}`}
                style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10 }}
              />
            )}
          </div>
        </div>
      );
    }

    // Read-only display
    const isEmpty = !value;
    const isEmail = key === 'email';

    return (
      <div
        key={key}
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr auto',
          columnGap: 14,
          alignItems: 'center',
          padding: '14px 0',
          borderBottom: isLast ? 'none' : '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--bg)',
            color: isEmpty ? 'var(--text3)' : 'var(--text2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={14} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--text3)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {label}
            {isEmail && <LockIcon size={9} style={{ opacity: 0.7 }} />}
          </div>
          <div
            style={{
              fontSize: 14,
              color: isEmpty ? 'var(--text3)' : 'var(--text)',
              fontStyle: isEmpty ? 'italic' : 'normal',
              fontWeight: isEmpty ? 400 : 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={value || ''}
          >
            {value || (isRequired ? 'Required — add this' : 'Not set')}
          </div>
        </div>
        {isEmpty && isRequired && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--accent)',
              padding: '3px 8px',
              background: 'var(--accent-lt)',
              borderRadius: 99,
            }}
          >
            <AlertCircle size={10} /> Required
          </span>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Business details
     ───────────────────────────────────────────── */
  const renderBusinessDetails = () => (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: editingDetails ? 'var(--bg)' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}>
            {editingDetails ? 'Edit details' : 'Business details'}
          </h3>
          <p style={{ margin: '3px 0 0', color: 'var(--text3)', fontSize: 13, lineHeight: 1.45 }}>
            {editingDetails
              ? 'Fill in or update any field, then save.'
              : 'Everything customers see and how to reach you.'}
          </p>
        </div>
        {!editingDetails ? (
          <button
            onClick={enterEditMode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: 'var(--card)',
              border: '1px solid var(--border-md)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--card)';
              e.currentTarget.style.borderColor = 'var(--border-md)';
              e.currentTarget.style.color = 'var(--text)';
            }}
          >
            <Edit2 size={13} /> Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setEditingDetails(false)}
              disabled={savingDetails}
              style={{
                padding: '8px 14px',
                background: 'transparent',
                border: '1px solid var(--border-md)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text2)',
                cursor: savingDetails ? 'not-allowed' : 'pointer',
                opacity: savingDetails ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateDetails}
              disabled={savingDetails}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'white',
                cursor: savingDetails ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-accent)',
                opacity: savingDetails ? 0.6 : 1,
              }}
            >
              <Check size={13} /> {savingDetails ? 'Saving' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '6px 24px 18px' }}>
        {FIELD_GROUPS.map((group, gi) => (
          <div
            key={group.title}
            style={{
              paddingTop: gi === 0 ? 18 : 24,
              borderTop: gi === 0 ? 'none' : '1px solid var(--border)',
              marginTop: gi === 0 ? 0 : 4,
            }}
          >
            <div style={{ marginBottom: 4 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text)',
                }}
              >
                {group.title}
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text3)' }}>
                {group.description}
              </p>
            </div>
            <div>{group.keys.map((k, ki) => renderFieldRow(k, ki === group.keys.length - 1))}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────
     Render: Public menu
     ───────────────────────────────────────────── */
  const renderPublicMenu = () => {
    if (!isBakerOrAdmin || !business?.username) return null;
    const url = `${window.location.origin}/menu/${business.username}`;

    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: 22,
        }}
      >
        <SectionHeader
          icon={Link2}
          iconBg="linear-gradient(135deg, var(--accent), var(--accent2))"
          iconColor="white"
          title="Your public menu"
          description="Share with customers"
        />

        <div
          style={{
            background: 'var(--bg)',
            borderRadius: 11,
            padding: '11px 13px',
            border: '1px solid var(--border)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Globe size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--text2)',
              fontFamily: 'monospace',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {url}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              showToast('Menu link copied', 'success');
            }}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 14px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Copy size={13} /> Copy link
          </button>
          <button
            onClick={() => window.open(`/menu/${business.username}`, '_blank')}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 14px',
              background: 'var(--card)',
              border: '1px solid var(--border-md)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            <ArrowUpRight size={13} /> Open
          </button>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Account security
     ───────────────────────────────────────────── */
  const renderAccountSecurity = () => (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        padding: 22,
      }}
    >
      <SectionHeader
        icon={Lock}
        iconBg="var(--accent-light)"
        iconColor="var(--accent)"
        title="Account security"
        description="Keep your account protected"
      />

      {(currentUser?.providerData || []).some((p) => p.providerId === 'google.com') ? (
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg)',
            borderRadius: 11,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>
              Signed in with Google
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Manage password at{' '}
              <a
                href="https://myaccount.google.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                myaccount.google.com
              </a>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowPasswordModal(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '13px 15px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 11,
            cursor: 'pointer',
            transition: 'var(--transition)',
            color: 'var(--text)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
            <Lock size={14} style={{ color: 'var(--text2)' }} />
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>Change password</span>
          </span>
          <ChevronRight size={14} style={{ color: 'var(--text3)' }} />
        </button>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────
     Render: Payment Setup (UPI QR upload)
     ───────────────────────────────────────────── */
  const renderPaymentSetup = () => {
    if (!isBakerOrAdmin) return null;
    const hasQr = !!localUpiQr;
    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: 22,
        }}
      >
        <SectionHeader
          icon={CreditCard}
          iconBg="rgba(181,96,106,0.14)"
          iconColor="var(--accent)"
          title="Payment QR"
          description="Upload your GPay / PhonePe UPI QR — invoices will print this exact QR so customers pay you directly"
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: 18,
            alignItems: 'center',
          }}
        >
          {/* Preview tile */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 14,
              border: hasQr ? '1px solid var(--border)' : '1.5px dashed var(--border-md)',
              background: hasQr ? '#FFFFFF' : 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              padding: hasQr ? 6 : 0,
            }}
          >
            {hasQr ? (
              <img
                src={localUpiQr}
                alt="UPI QR preview"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                <CreditCard size={26} style={{ opacity: 0.5 }} />
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    marginTop: 6,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  No QR yet
                </div>
              </div>
            )}
          </div>

          {/* Hidden input + actions */}
          <div style={{ minWidth: 0 }}>
            <input
              ref={qrFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpiQrUpload}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, var(--accent), #8A3D4A)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent, 0 8px 18px -6px rgba(181,96,106,0.45))',
                }}
              >
                <Upload size={14} strokeWidth={2.4} />
                {hasQr ? 'Replace QR' : 'Upload QR'}
              </button>

              {hasQr && (
                <button
                  type="button"
                  onClick={handleUpiQrRemove}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    background: 'transparent',
                    color: 'var(--text2)',
                    border: '1px solid var(--border-md)',
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                  Remove
                </button>
              )}
            </div>

            <p
              style={{
                marginTop: 10,
                fontSize: 11.5,
                color: 'var(--text3)',
                lineHeight: 1.55,
              }}
            >
              Open GPay / PhonePe → My QR → Save image. Upload that here.
              {hasQr
                ? ' This QR is now embedded on every invoice you generate.'
                : ' Otherwise we auto-generate a QR from your UPI ID.'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: App Preferences (footer customisation, etc.)
     ───────────────────────────────────────────── */
  const renderAppPreferences = () => {
    const items = [
      {
        key: 'footer-customise',
        icon: Sliders,
        label: 'Footer shortcuts',
        desc: 'Choose which 4 shortcuts appear in the bottom nav',
        onTap: () => {
          try {
            window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: 'light' }));
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('cc-open-bottom-nav-customise'));
        },
      },
    ];

    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: 22,
        }}
      >
        <SectionHeader
          icon={Sliders}
          iconBg="rgba(181,96,106,0.14)"
          iconColor="var(--accent)"
          title="App Preferences"
          description="Personalise how the app feels"
        />

        <div>
          {items.map(({ key, icon: ItemIcon, label, desc, onTap }, idx) => (
            <button
              key={key}
              onClick={onTap}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: idx !== items.length - 1 ? '1px solid var(--border)' : 'none',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(181,96,106,0.10)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ItemIcon size={16} strokeWidth={2} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color="var(--text3)" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Notifications
     ───────────────────────────────────────────── */
  const renderNotifications = () => {
    const items = [
      { key: 'email', label: 'Email alerts', desc: 'Order updates via email' },
      { key: 'whatsapp', label: 'WhatsApp notifications', desc: 'Instant updates on WhatsApp' },
      { key: 'orders', label: 'Push notifications', desc: 'Real-time browser alerts' },
    ];

    return (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: 22,
        }}
      >
        <SectionHeader
          icon={Bell}
          iconBg="rgba(168,216,200,0.25)"
          iconColor="#4A9A80"
          title="Notifications"
          description="Choose how you stay updated"
        />

        <div>
          {items.map(({ key, label, desc }, idx) => {
            const isOn = !!userDoc.notifications?.[key];
            const toggle = () => {
              const newNotifs = { ...userDoc.notifications, [key]: !isOn };
              setUserDoc({ ...userDoc, notifications: newNotifs });
              updateDoc(doc(db, 'users', currentUser.uid), { notifications: newNotifs });
            };
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '13px 0',
                  borderBottom: idx !== items.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
                </div>
                <button
                  onClick={toggle}
                  aria-label={label}
                  aria-pressed={isOn}
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 25,
                    borderRadius: 99,
                    border: 'none',
                    cursor: 'pointer',
                    padding: 3,
                    background: isOn
                      ? 'linear-gradient(135deg, var(--accent), #8A3D4A)'
                      : 'var(--border-md)',
                    transition: 'background 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOn ? 'flex-end' : 'flex-start',
                    boxShadow: isOn ? '0 2px 8px rgba(181,96,106,0.35)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: '50%',
                      background: 'white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      transition: 'all 0.25s var(--spring)',
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────
     Render: Sign out
     ───────────────────────────────────────────── */
  const renderSignOut = () => (
    <button
      onClick={logout}
      style={{
        width: '100%',
        padding: '13px 18px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--accent)',
        transition: 'var(--transition)',
        boxShadow: 'var(--shadow-xs)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--accent-lt)';
        e.currentTarget.style.borderColor = 'var(--accent-lt)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--card)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <LogOut size={14} /> Sign out
    </button>
  );

  /* ─────────────────────────────────────────────
     Render: Danger zone (delete account)
     ───────────────────────────────────────────── */
  const isGoogleUser = (currentUser?.providerData || []).some((p) => p.providerId === 'google.com');
  const isAppleUser = (currentUser?.providerData || []).some((p) => p.providerId === 'apple.com');
  const CONFIRM_PHRASE = 'DELETE';

  const renderDangerZone = () => (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid rgba(220,38,38,0.25)',
        boxShadow: 'var(--shadow-xs)',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: 'rgba(220,38,38,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#B91C1C' }}>
            Danger zone
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.4 }}>
            Permanently delete your account and data
          </p>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 14 }}>
        This removes your profile, business details and sign-in. Orders and recipes lose their owner
        and become inaccessible. This action cannot be undone.
      </p>
      <button
        onClick={() => {
          setDeleteStep(1);
          setDeleteReason('');
          setDeleteDetail('');
          setDeleteConfirmText('');
          setDeletePassword('');
          setShowDeleteModal(true);
        }}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: '1.5px solid rgba(220,38,38,0.4)',
          borderRadius: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 13.5,
          fontWeight: 700,
          color: '#DC2626',
          transition: 'var(--transition)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(220,38,38,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Trash2 size={15} /> Delete my account
      </button>
    </div>
  );

  const DELETE_REASONS = [
    'Not using it anymore',
    'Too complicated to use',
    'Missing features I need',
    'Switching to another app',
    'Privacy concerns',
    'Just testing / made by mistake',
    'Other',
  ];

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { deleteCurrentAccount } = await import('../services/auth');
      await deleteCurrentAccount({
        password: isGoogleUser || isAppleUser ? undefined : deletePassword,
        reason: deleteReason,
        detail: deleteDetail,
      });
      showToast('Account deleted. Goodbye 👋', 'success');
      // deleteUser signs out; route to login.
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err) {
      console.error('Delete account error:', err);
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        showToast('Incorrect password. Please try again.', 'error');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showToast('Verification cancelled.', 'error');
      } else {
        showToast(err?.message || 'Could not delete account', 'error');
      }
      setDeleting(false);
    }
  };

  /* ─────────────────────────────────────────────
     Layout
     ───────────────────────────────────────────── */
  return (
    <div className="fade-in" style={{ maxWidth: 1140, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your bakery identity, contacts, payments and account.</p>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {renderHeroCard()}
          {renderQuickStats()}
          {isBakerOrAdmin && renderBusinessDetails()}
          {isBakerOrAdmin && renderPaymentSetup()}
          {renderPublicMenu()}
          {renderAccountSecurity()}
          {renderSignOut()}
          {renderDangerZone()}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: 20,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              position: 'sticky',
              top: 20,
            }}
          >
            {renderHeroCard()}
            {renderQuickStats()}
            {renderPublicMenu()}
            {renderSignOut()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isBakerOrAdmin && renderBusinessDetails()}
            {isBakerOrAdmin && renderPaymentSetup()}
            {renderAccountSecurity()}
            {renderDangerZone()}
          </div>
        </div>
      )}

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowPasswordModal(false)}
            style={{ zIndex: 1000 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 420 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 22,
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>Change password</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text3)' }}>
                    Use at least 6 characters
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setShowPasswordModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (passForm.new !== passForm.confirm)
                    return showToast('Passwords do not match', 'error');
                  if (passForm.new.length < 6) return showToast('Password too short', 'error');

                  setChangingPass(true);
                  try {
                    const { changeUserPassword } = await import('../services/auth');
                    await changeUserPassword(passForm.current, passForm.new);
                    showToast('Password updated', 'success');
                    setShowPasswordModal(false);
                    setPassForm({ current: '', new: '', confirm: '' });
                  } catch (err) {
                    showToast(err.message || 'Failed to update password', 'error');
                  } finally {
                    setChangingPass(false);
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Current password</label>
                    <input
                      type="password"
                      required
                      value={passForm.current}
                      onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New password</label>
                    <input
                      type="password"
                      required
                      value={passForm.new}
                      onChange={(e) => setPassForm({ ...passForm, new: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Confirm new password</label>
                    <input
                      type="password"
                      required
                      value={passForm.confirm}
                      onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={changingPass}
                    style={{ marginTop: 6 }}
                  >
                    {changingPass ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Modal (multi-step, deliberately effortful) ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div
            className="modal-overlay"
            onClick={() => !deleting && setShowDeleteModal(false)}
            style={{ zIndex: 1200, alignItems: 'flex-end' }}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 460,
                margin: '0 auto',
                background: 'var(--card)',
                borderRadius: '28px 28px 0 0',
                padding: '14px 22px',
                paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 16px))',
                maxHeight: 'calc(100vh - 80px)',
                overflowY: 'auto',
                boxShadow: '0 -16px 50px rgba(0,0,0,0.25)',
              }}
            >
              {/* drag pill */}
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 99,
                  background: 'var(--border-md)',
                  margin: '0 auto 18px',
                }}
              />

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: deleteStep >= s ? '#DC2626' : 'var(--border-md)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>

              {/* STEP 1 — Reason */}
              {deleteStep === 1 && (
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--text)',
                    }}
                  >
                    We're sorry to see you go
                  </h2>
                  <p
                    style={{
                      margin: '6px 0 18px',
                      fontSize: 13.5,
                      color: 'var(--text3)',
                      lineHeight: 1.5,
                    }}
                  >
                    Before you leave, could you tell us why? It helps us improve.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {DELETE_REASONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setDeleteReason(r)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '13px 15px',
                          borderRadius: 12,
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 600,
                          color: deleteReason === r ? '#B91C1C' : 'var(--text)',
                          background: deleteReason === r ? 'rgba(220,38,38,0.07)' : 'var(--bg)',
                          border:
                            deleteReason === r
                              ? '1.5px solid rgba(220,38,38,0.4)'
                              : '1.5px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s',
                        }}
                      >
                        {r}
                        {deleteReason === r && <Check size={15} color="#DC2626" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                  {deleteReason === 'Other' && (
                    <textarea
                      value={deleteDetail}
                      onChange={(e) => setDeleteDetail(e.target.value)}
                      placeholder="Tell us more (optional)…"
                      rows={3}
                      style={{ marginTop: 10, resize: 'vertical', width: '100%' }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button onClick={() => setShowDeleteModal(false)} style={{ ...ghostBtn }}>
                      Keep my account
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      disabled={!deleteReason}
                      style={{
                        ...dangerBtn,
                        opacity: deleteReason ? 1 : 0.5,
                        cursor: deleteReason ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — Type DELETE to confirm */}
              {deleteStep === 2 && (
                <div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: 'rgba(220,38,38,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DC2626',
                      marginBottom: 14,
                    }}
                  >
                    <AlertCircle size={26} />
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#B91C1C',
                    }}
                  >
                    This is permanent
                  </h2>
                  <p
                    style={{
                      margin: '6px 0 16px',
                      fontSize: 13.5,
                      color: 'var(--text3)',
                      lineHeight: 1.6,
                    }}
                  >
                    Your profile, business details and sign-in will be erased. To confirm, type{' '}
                    <strong style={{ color: '#B91C1C', letterSpacing: 1 }}>{CONFIRM_PHRASE}</strong>{' '}
                    below.
                  </p>
                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={`Type ${CONFIRM_PHRASE}`}
                    autoCapitalize="characters"
                    style={{
                      width: '100%',
                      letterSpacing: 2,
                      fontWeight: 700,
                      textAlign: 'center',
                      borderColor:
                        deleteConfirmText === CONFIRM_PHRASE ? 'rgba(220,38,38,0.5)' : undefined,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                    <button onClick={() => setDeleteStep(1)} style={{ ...ghostBtn }}>
                      Back
                    </button>
                    <button
                      onClick={() => setDeleteStep(3)}
                      disabled={deleteConfirmText !== CONFIRM_PHRASE}
                      style={{
                        ...dangerBtn,
                        opacity: deleteConfirmText === CONFIRM_PHRASE ? 1 : 0.5,
                        cursor: deleteConfirmText === CONFIRM_PHRASE ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Re-authenticate */}
              {deleteStep === 3 && (
                <div>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: 'rgba(220,38,38,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DC2626',
                      marginBottom: 14,
                    }}
                  >
                    <Lock size={24} />
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--text)',
                    }}
                  >
                    Verify it's you
                  </h2>
                  {isGoogleUser || isAppleUser ? (
                    <>
                      <p
                        style={{
                          margin: '6px 0 16px',
                          fontSize: 13.5,
                          color: 'var(--text3)',
                          lineHeight: 1.6,
                        }}
                      >
                        For your security, confirm with {isGoogleUser ? 'Google' : 'Apple'}. A popup
                        will appear — sign in once more to authorise deletion.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        style={{ ...dangerBtn, width: '100%' }}
                      >
                        {deleting
                          ? 'Deleting…'
                          : `Verify with ${isGoogleUser ? 'Google' : 'Apple'} & delete`}
                      </button>
                    </>
                  ) : (
                    <>
                      <p
                        style={{
                          margin: '6px 0 16px',
                          fontSize: 13.5,
                          color: 'var(--text3)',
                          lineHeight: 1.6,
                        }}
                      >
                        Enter your password to permanently delete your account.
                      </p>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        style={{ width: '100%' }}
                      />
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || !deletePassword}
                        style={{
                          ...dangerBtn,
                          width: '100%',
                          marginTop: 14,
                          opacity: deleting || !deletePassword ? 0.5 : 1,
                          cursor: deleting || !deletePassword ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {deleting ? 'Deleting…' : 'Permanently delete account'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeleteStep(2)}
                    disabled={deleting}
                    style={{ ...ghostBtn, width: '100%', marginTop: 10 }}
                  >
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Shared button styles for the delete flow
const ghostBtn = {
  flex: 1,
  padding: '13px 16px',
  background: 'transparent',
  border: '1.5px solid var(--border-md)',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text2)',
  cursor: 'pointer',
};

const dangerBtn = {
  flex: 1,
  padding: '13px 16px',
  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  border: 'none',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 800,
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(220,38,38,0.3)',
};

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 'var(--radius-pill)',
  background: 'var(--bg)',
  color: 'var(--text2)',
  fontSize: 11.5,
  fontWeight: 600,
  border: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
