import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, User2, ArrowUpRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { showToast } from '../../components/iOS';
import { uploadToCloudinary } from '../../services/cloudinary';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { SaveBar } from './MenuBuilderShell';

// Only MENU-SPECIFIC content lives here now. Identity & contact
// (name, logo, whatsapp, instagram, website, city) are read from the
// business profile so the user never types them twice.
const MENU_FIELD_GROUPS = [
  {
    label: '🕐 Operations',
    fields: [
      { key: 'timings', label: 'Timings', placeholder: 'Mon–Sat, 9am–8pm' },
      {
        key: 'deliveryLocations',
        label: 'Delivery Locations',
        placeholder: 'Andheri, Bandra, Juhu',
      },
    ],
  },
];

function ImageUploadBlock({ label, fieldKey, value, uploading, onUpload, description }) {
  const ref = useRef(null);
  const isUploading = uploading === fieldKey;

  return (
    <div>
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={() => ref.current?.click()}
        style={{
          width: '100%',
          height: 140,
          borderRadius: 16,
          background: value ? 'transparent' : 'var(--bg)',
          border: value ? 'none' : '2px dashed var(--border)',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          position: 'relative',
        }}
      >
        {isUploading ? (
          <>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 700 }}>
              Uploading…
            </span>
          </>
        ) : value ? (
          <>
            <img
              src={value}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
            >
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>📷 Change</span>
            </div>
          </>
        ) : (
          <>
            <Camera size={22} color="var(--text3)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 700 }}>
              Tap to upload
            </span>
          </>
        )}
      </motion.button>
      {description && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4 }}>{description}</div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={(e) => onUpload(e.target.files?.[0], fieldKey)}
        style={{ display: 'none' }}
      />
    </div>
  );
}

// Read-only chip showing a value synced from the business profile.
function SyncedChip({ label, value }) {
  const has = value && String(value).trim();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.62rem',
            fontWeight: 800,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: has ? 'var(--text)' : 'var(--text3)',
            fontStyle: has ? 'normal' : 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {has ? value : 'Not set in profile'}
        </div>
      </div>
      {has && <Check size={15} color="#10B981" strokeWidth={2.6} style={{ flexShrink: 0 }} />}
    </div>
  );
}

export default function CreateMenu() {
  const { menu, business, loading, saveMenu } = useMenuBuilderData();
  const [form, setForm] = useState(menu);
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(menu), [menu]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file, key) => {
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadToCloudinary(file);
      update(key, url);
      await saveMenu({ [key]: url });
      showToast('Image updated! ✨', 'success');
    } catch {
      showToast('Image upload failed', 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      // Only persist menu-specific keys — never the profile-synced ones.
      await saveMenu({
        heroImage: form.heroImage,
        heroTitle: form.heroTitle,
        description: form.description,
        timings: form.timings,
        deliveryLocations: form.deliveryLocations,
      });
      showToast('Menu details saved! 🎉', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <MenuBuilderShell title="Bakery Details" subtitle="Set the identity for your public menu.">
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      </MenuBuilderShell>
    );

  const b = business || {};
  const websiteValue = b.website || b.portfolioLink || '';

  return (
    <MenuBuilderShell
      title="Bakery Details"
      subtitle="Menu-only content. Your identity comes straight from your profile."
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Synced from profile (read-only) ── */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <User2 size={15} color="var(--accent)" /> From your profile
            </div>
            <Link
              to="/profile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              Edit profile <ArrowUpRight size={13} />
            </Link>
          </div>
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text3)',
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            These show on your menu automatically. Update them once in your profile — no need to
            re-type here.
          </div>

          {/* Logo preview synced from profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                flexShrink: 0,
                overflow: 'hidden',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {menu.logoUrl && menu.logoUrl !== '/logo.png' ? (
                <img
                  src={menu.logoUrl}
                  alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 24 }}>🧁</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--text)',
                  lineHeight: 1.1,
                }}
              >
                {menu.bakeryName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text2)', fontStyle: 'italic' }}>
                {menu.tagline}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SyncedChip label="WhatsApp" value={b.whatsapp || b.phone} />
            <SyncedChip label="Instagram" value={b.instagram} />
            <SyncedChip label="Website" value={websiteValue} />
            <SyncedChip label="City" value={b.city} />
          </div>
        </div>

        {/* ── Hero Image (menu-specific) ── */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 900,
              color: 'var(--text)',
              marginBottom: 14,
            }}
          >
            📸 Menu Hero Image
          </div>
          <ImageUploadBlock
            label="Hero Banner"
            fieldKey="heroImage"
            value={form.heroImage}
            uploading={uploading}
            onUpload={uploadImage}
            description="Wide banner shown at the top of your menu, 16:9"
          />
        </div>

        {/* ── Menu content ── */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div
            style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}
          >
            📝 Menu Content
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Hero Title</span>
              <textarea
                value={form.heroTitle || ''}
                onChange={(e) => update('heroTitle', e.target.value)}
                rows={2}
                placeholder="e.g. Freshly Baked With Love 🧁"
                style={{ resize: 'vertical' }}
              />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Description</span>
              <textarea
                value={form.description || ''}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                placeholder="Tell customers about your bakery…"
                style={{ resize: 'vertical' }}
              />
            </label>
          </div>
        </div>

        {/* ── Operations (menu-specific) ── */}
        {MENU_FIELD_GROUPS.map((group) => (
          <div key={group.label} className="card" style={{ padding: 20, borderRadius: 20 }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: 'var(--text)',
                marginBottom: 14,
              }}
            >
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.fields.map((field) => (
                <label key={field.key} className="form-group" style={{ margin: 0 }}>
                  <span className="form-label">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] || ''}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ fontSize: '0.9rem' }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <button type="submit" style={{ display: 'none' }} />
      </form>

      <SaveBar onSave={handleSave} saving={saving} label="Save Details" />
    </MenuBuilderShell>
  );
}
