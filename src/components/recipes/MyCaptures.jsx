import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { showToast, triggerHaptic } from '../iOS';
import { uploadToCloudinary } from '../../services/cloudinary';
import { addCaptureToDB, updateCaptureInDB, deleteCaptureFromDB, subscribeToCaptures } from '../../services/userCaptures';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Bakes', 'Cakes', 'Breads', 'Desserts', 'Drinks', 'Other'];

function UploadSheet({ onClose, editItem }) {
  const { currentUser } = useAuth();
  const fileRef = useRef();
  const [previews, setPreviews] = useState(editItem?.photos?.map(u => ({ url: u, uploaded: true })) || []);
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState(editItem?.title || '');
  const [notes, setNotes] = useState(editItem?.notes || '');
  const [category, setCategory] = useState(editItem?.category || 'Bakes');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(editItem?.tags || []);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 5 - previews.length);
    const newPreviews = picked.map(f => ({ url: URL.createObjectURL(f), uploaded: false, file: f }));
    setPreviews(p => [...p, ...newPreviews].slice(0, 5));
    setFiles(fls => [...fls, ...picked].slice(0, 5));
  };

  const removePhoto = (idx) => {
    setPreviews(p => p.filter((_, i) => i !== idx));
    setFiles(f => f.filter((_, i) => i !== idx));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags(tg => [...tg, t]); setTagInput(''); }
  };

  const handleSave = async () => {
    if (!title.trim()) return showToast('Add a title first', 'error');
    if (previews.length === 0) return showToast('Add at least one photo', 'error');
    setSaving(true);
    try {
      const newUrls = [];
      const toUpload = previews.filter(p => !p.uploaded);
      for (let i = 0; i < toUpload.length; i++) {
        const url = await uploadToCloudinary(toUpload[i].file, (pct) => {
          setProgress(Math.round(((i + pct / 100) / toUpload.length) * 100));
        });
        newUrls.push(url);
      }
      const existingUrls = previews.filter(p => p.uploaded).map(p => p.url);
      const allPhotos = [...existingUrls, ...newUrls];

      const data = { title: title.trim(), notes: notes.trim(), category, tags, photos: allPhotos, coverPhotoIndex: 0 };
      if (editItem) {
        await updateCaptureInDB(editItem.id, data);
        showToast('Recipe updated! ✅', 'success');
      } else {
        await addCaptureToDB({ ...data, userId: currentUser.uid });
        showToast('Recipe saved! 📸', 'success');
      }
      triggerHaptic('success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Upload failed', 'error');
    } finally {
      setSaving(false); setProgress(0);
    }
  };

  return (
    <div style={{ padding: '0 20px 40px' }}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, margin: '20px -20px', paddingLeft: 20 }}>
        {previews.map((p, i) => (
          <div key={i} style={{ width: 100, height: 100, borderRadius: 16, flexShrink: 0, position: 'relative', overflow: 'hidden', boxShadow: 'var(--rv-shadow-sm)' }}>
            <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button 
              onClick={() => removePhoto(i)}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} />
            </button>
            {i === 0 && <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 8 }}>Cover</span>}
          </div>
        ))}
        {previews.length < 5 && (
          <button 
            onClick={() => fileRef.current?.click()}
            style={{ width: 100, height: 100, borderRadius: 16, flexShrink: 0, background: 'var(--rv-pink-light)', color: 'var(--accent)', border: '1px dashed var(--accent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}>
            <Camera size={24} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>Add</span>
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={handleFiles} />

      {saving && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 6, background: '#E5E5EA', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--rv-muted)', marginTop: 8, fontWeight: 600 }}>Uploading… {progress}%</p>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input 
          placeholder="Recipe Title *" value={title} onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', padding: '16px', fontSize: 18, fontWeight: 700, border: '1px solid #E5E5EA', borderRadius: 12, outline: 'none' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <textarea 
          placeholder="Notes, tips, source…" value={notes} onChange={e => setNotes(e.target.value)}
          style={{ width: '100%', padding: '16px', fontSize: 15, border: '1px solid #E5E5EA', borderRadius: 12, outline: 'none', minHeight: 100, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button 
            key={c} 
            onClick={() => setCategory(c)}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: category === c ? 'var(--accent)' : '#F2F2F7', color: category === c ? '#fff' : 'var(--rv-muted)', transition: 'all 0.2s' }}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input 
          placeholder="Add a tag…" value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          style={{ flex: 1, padding: '12px 16px', fontSize: 15, border: '1px solid #E5E5EA', borderRadius: 12, outline: 'none' }} 
        />
        <button 
          onClick={addTag}
          style={{ padding: '0 20px', background: '#F2F2F7', color: 'var(--rv-dark)', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={20} />
        </button>
      </div>
      
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--rv-pink-light)', color: 'var(--accent)', borderRadius: 16, fontSize: 13, fontWeight: 600 }}>
              {t} 
              <button onClick={() => setTags(tg => tg.filter(x => x !== t))} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <button 
        onClick={handleSave} disabled={saving}
        style={{ width: '100%', background: 'var(--rv-pink-gradient)', color: '#fff', border: 'none', padding: '18px', borderRadius: 16, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: 'var(--rv-shadow-pink)' }}>
        {saving ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : editItem ? 'Update Recipe' : 'Save Capture'}
      </button>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MyCaptures({ userId }) {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const unsub = subscribeToCaptures(
      (items) => { setCaptures(items); setLoading(false); },
      () => setLoading(false),
      userId
    );
    return unsub;
  }, [userId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this capture?')) return;
    await deleteCaptureFromDB(id);
    showToast('Deleted', 'info');
    triggerHaptic('light');
    if (viewing?.id === id) setViewing(null);
  };

  if (loading) return (
    <div style={{ padding: '32px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 250, width: 'calc(50% - 8px)', borderRadius: 20, background: '#F2F2F7', animation: 'pulse 1.5s infinite' }} />)}
      <style>{`@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '40px 20px 100px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--rv-dark)' }}>My Captures</h2>
          <p style={{ color: 'var(--rv-muted)', fontSize: 15, fontWeight: 500, marginTop: 4 }}>Snap and save handwritten recipes</p>
        </div>
        <button 
          onClick={() => { setEditItem(null); setShowSheet(true); triggerHaptic('light'); }}
          style={{ background: 'var(--rv-pink-gradient)', color: '#fff', border: 'none', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rv-shadow-pink)', flexShrink: 0 }}>
          <Plus size={24} />
        </button>
      </div>

      {captures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: '#fff', borderRadius: 24, border: '1px solid #E5E5EA' }}>
          <div style={{ width: 80, height: 80, background: 'var(--rv-pink-light)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Camera size={40} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>No Captures Yet</h3>
          <p style={{ color: 'var(--rv-muted)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>Snap a photo of handwritten cards, cookbook pages, or your own creations.</p>
          <button 
            onClick={() => { setShowSheet(true); triggerHaptic('light'); }}
            style={{ background: '#1C1C1E', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 20, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Capture First Recipe
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {captures.map(c => (
            <motion.div 
              key={c.id} 
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setViewing(c); setPhotoIdx(0); triggerHaptic('light'); }}
              style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--rv-shadow-sm)', border: '1px solid #E5E5EA', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
                <img src={c.photos?.[0] || ''} alt={c.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, color: 'var(--rv-dark)' }}>
                  {c.category}
                </div>
                {c.photos?.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ImageIcon size={12} /> +{c.photos.length - 1}
                  </div>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--rv-dark)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.title}</h4>
                {c.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {c.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 11, fontWeight: 700, color: 'var(--rv-muted)', background: '#F2F2F7', padding: '2px 8px', borderRadius: 8 }}>{t}</span>)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Modal */}
      <AnimatePresence>
        {viewing && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setViewing(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#fff', width: '100%', maxWidth: 500, borderRadius: 28, overflow: 'hidden', position: 'relative', zIndex: 10, boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
            >
              {viewing.photos?.length > 0 && (
                <div style={{ position: 'relative', width: '100%', height: 350, background: '#1C1C1E' }}>
                  <img src={viewing.photos[photoIdx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <button onClick={() => setViewing(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--rv-dark)' }}><X size={20} /></button>
                  
                  {viewing.photos.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
                      {viewing.photos.map((_, i) => (
                        <button key={i} onClick={() => setPhotoIdx(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', padding: 0 }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--rv-dark)', margin: 0 }}>{viewing.title}</h2>
                </div>
                
                <span style={{ display: 'inline-block', background: 'var(--rv-pink-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 12, marginBottom: 16 }}>{viewing.category}</span>
                
                {viewing.notes && <p style={{ fontSize: 16, color: 'var(--rv-muted)', lineHeight: 1.6, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>{viewing.notes}</p>}
                
                {viewing.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {viewing.tags.map(t => <span key={t} style={{ fontSize: 13, fontWeight: 600, color: 'var(--rv-muted)', background: '#F2F2F7', padding: '6px 12px', borderRadius: 12 }}>{t}</span>)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #E5E5EA', paddingTop: 20 }}>
                  <button 
                    onClick={() => { setEditItem(viewing); setShowSheet(true); setViewing(null); }}
                    style={{ flex: 1, background: '#F2F2F7', color: 'var(--rv-dark)', border: 'none', padding: '16px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    Edit Details
                  </button>
                  <button 
                    onClick={() => handleDelete(viewing.id)}
                    style={{ width: 54, background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Sheet Overlay */}
      <AnimatePresence>
        {showSheet && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => setShowSheet(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} 
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ background: '#fff', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', borderTopLeftRadius: 32, borderTopRightRadius: 32, position: 'relative', zIndex: 10, boxShadow: '0 -20px 40px rgba(0,0,0,0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <div style={{ width: 40, height: 5, borderRadius: 3, background: '#E5E5EA' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 24px' }}>
                <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--rv-dark)' }}>{editItem ? 'Edit Capture' : 'New Capture'}</h3>
                <button onClick={() => setShowSheet(false)} style={{ background: '#F2F2F7', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--rv-dark)' }}><X size={16} /></button>
              </div>
              <UploadSheet onClose={() => setShowSheet(false)} editItem={editItem} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
