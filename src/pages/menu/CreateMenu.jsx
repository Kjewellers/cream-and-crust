import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { showToast } from '../../components/iOS';
import { uploadToCloudinary } from '../../services/cloudinary';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell, { SaveBar } from './MenuBuilderShell';

const FIELD_GROUPS = [
  {
    label: '🏪 Identity',
    fields: [
      { key: 'bakeryName', label: 'Bakery Name', placeholder: 'e.g. Cream & Crust' },
      { key: 'tagline', label: 'Tagline', placeholder: 'e.g. Baked with love ✨' },
    ],
  },
  {
    label: '📞 Contact & Socials',
    fields: [
      { key: 'whatsapp', label: 'WhatsApp Number', placeholder: '+91 98765 43210', type: 'tel' },
      { key: 'instagram', label: 'Instagram Handle', placeholder: '@yourbakery' },
    ],
  },
  {
    label: '🕐 Operations',
    fields: [
      { key: 'timings', label: 'Timings', placeholder: 'Mon–Sat, 9am–8pm' },
      { key: 'deliveryLocations', label: 'Delivery Locations', placeholder: 'Andheri, Bandra, Juhu' },
    ],
  },
];

function ImageUploadBlock({ label, fieldKey, value, uploading, onUpload, description }) {
  const ref = useRef(null);
  const isUploading = uploading === fieldKey;

  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
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
          <><Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} /><span style={{ fontSize: '0.75rem', color: 'var(--text2)', fontWeight: 700 }}>Uploading…</span></>
        ) : value ? (
          <>
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>📷 Change</span>
            </div>
          </>
        ) : (
          <><Camera size={22} color="var(--text3)" /><span style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 700 }}>Tap to upload</span></>
        )}
      </motion.button>
      {description && <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4 }}>{description}</div>}
      <input ref={ref} type="file" accept="image/*" onChange={e => onUpload(e.target.files?.[0], fieldKey)} style={{ display: 'none' }} />
    </div>
  );
}

export default function CreateMenu() {
  const { menu, loading, saveMenu } = useMenuBuilderData();
  const [form, setForm] = useState(menu);
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(menu), [menu]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

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
      await saveMenu(form);
      showToast('Bakery details saved! 🎉', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <MenuBuilderShell title="Bakery Details" subtitle="Set the identity for your public menu.">
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    </MenuBuilderShell>
  );

  return (
    <MenuBuilderShell title="Bakery Details" subtitle="Set the identity and ordering info for your public menu.">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Image Uploads */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            📸 Photos
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ImageUploadBlock
              label="Logo"
              fieldKey="logoUrl"
              value={form.logoUrl}
              uploading={uploading}
              onUpload={uploadImage}
              description="Square, min 200×200"
            />
            <ImageUploadBlock
              label="Hero Image"
              fieldKey="heroImage"
              value={form.heroImage}
              uploading={uploading}
              onUpload={uploadImage}
              description="Wide banner, 16:9"
            />
          </div>
        </div>

        {/* Field Groups */}
        {FIELD_GROUPS.map(group => (
          <div key={group.label} className="card" style={{ padding: 20, borderRadius: 20 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>{group.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.fields.map(field => (
                <label key={field.key} className="form-group" style={{ margin: 0 }}>
                  <span className="form-label">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] || ''}
                    onChange={e => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ fontSize: '0.9rem' }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Text areas */}
        <div className="card" style={{ padding: 20, borderRadius: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--text)', marginBottom: 14 }}>📝 Content</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Hero Title</span>
              <textarea value={form.heroTitle || ''} onChange={e => update('heroTitle', e.target.value)} rows={2} placeholder="e.g. Freshly Baked With Love 🧁" style={{ resize: 'vertical' }} />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Description</span>
              <textarea value={form.description || ''} onChange={e => update('description', e.target.value)} rows={3} placeholder="Tell customers about your bakery…" style={{ resize: 'vertical' }} />
            </label>
          </div>
        </div>

        <button type="submit" style={{ display: 'none' }} />
      </form>

      <SaveBar onSave={handleSave} saving={saving} label="Save Details" />
    </MenuBuilderShell>
  );
}
