import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ArrowLeft, Sparkles, Camera, 
  Check, Instagram, MessageCircle, MapPin, 
  Store, Palette, Image as ImageIcon, Loader2
} from 'lucide-react';
import { triggerHaptic } from '../iOS';

const steps = [
  { 
    id: 'basic', 
    title: 'The Basics', 
    subtitle: 'Every brand starts with a name.',
    icon: Store,
    fields: [
      { key: 'name', label: 'Bakery Name', placeholder: 'e.g. Blue Ribbon Bakes', type: 'text' },
      { key: 'type', label: 'Bakery Type', placeholder: 'e.g. Artisan Cake Studio', type: 'text' }
    ]
  },
  { 
    id: 'social', 
    title: 'Get Connected', 
    subtitle: 'Where can customers find you?',
    icon: Instagram,
    fields: [
      { key: 'instagram', label: 'Instagram Handle', placeholder: '@username', type: 'text' },
      { key: 'whatsapp', label: 'WhatsApp Number', placeholder: '+91...', type: 'tel' },
      { key: 'city', label: 'Delivery City', placeholder: 'e.g. Mumbai', type: 'text' }
    ]
  },
  { 
    id: 'visual', 
    title: 'Brand Visuals', 
    subtitle: 'First impressions are everything.',
    icon: ImageIcon,
    fields: [
      { key: 'logo', label: 'Brand Logo', type: 'file' },
      { key: 'hero', label: 'Cover Image', type: 'file' }
    ]
  }
];

export default function PremiumOnboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', type: '', instagram: '', whatsapp: '', city: '', logo: '', hero: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const [activeFileKey, setActiveFileKey] = useState(null);

  const handleFileClick = (key) => {
    setActiveFileKey(key);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeFileKey) return;
    
    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import('../../services/cloudinary');
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, [activeFileKey]: url }));
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };


  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    console.log("Onboarding: handleNext called", { currentStep, isLastStep });
    try {
      triggerHaptic('medium');
    } catch (e) {
      console.warn("Haptic failed", e);
    }
    
    if (isLastStep) {
      console.log("Onboarding: Calling onComplete", formData);
      onComplete(formData);
    } else {
      console.log("Onboarding: Incrementing step");
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    triggerHaptic('light');
    setCurrentStep(prev => prev - 1);
  };

  const updateField = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 4000, 
      background: '#FFFFFF', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      {/* Progress Header */}
      <div style={{ height: 6, display: 'flex' }}>
        {steps.map((_, i) => (
          <div key={i} style={{ 
            flex: 1, 
            background: i <= currentStep ? 'linear-gradient(90deg, #2563EB, #60A5FA)' : '#F1F5F9',
            transition: '0.5s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ width: '100%', maxWidth: 500 }}
          >
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: 20, 
              background: '#F1F5F9', 
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32
            }}>
              <step.icon size={32} />
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: '#0F172A', marginBottom: 12 }}>{step.title}</h1>
            <p style={{ fontSize: '1.1rem', color: '#64748B', marginBottom: 48 }}>{step.subtitle}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {step.fields.map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{f.label}</label>
                  {f.type === 'file' ? (
                    <div 
                      onClick={() => handleFileClick(f.key)}
                      style={{ 
                        height: 120, 
                        borderRadius: 20, 
                        border: '2px dashed #E2E8F0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#F8FAFC',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      {formData[f.key] ? (
                        <img src={formData[f.key]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                          <Camera size={24} style={{ marginBottom: 8 }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Upload Image</div>
                        </div>
                      )}
                      {isUploading && activeFileKey === f.key && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 className="animate-spin" size={24} color="#2563EB" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <input 
                      type={f.type}
                      placeholder={f.placeholder}
                      value={formData[f.key]}
                      onChange={e => updateField(f.key, e.target.value)}
                      style={{ 
                        height: 60, 
                        borderRadius: 16, 
                        border: '1px solid #E2E8F0', 
                        padding: '0 20px', 
                        fontSize: '1rem',
                        background: '#F8FAFC'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ 
        padding: 40, 
        borderTop: '1px solid #F1F5F9', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {currentStep > 0 ? (
          <button 
            onClick={handleBack}
            style={{ 
              background: 'none', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              color: '#64748B', 
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} /> Back
          </button>
        ) : <div />}

        <button 
          onClick={handleNext}
          style={{ 
            height: 60, 
            padding: '0 40px', 
            borderRadius: 20, 
            background: '#0F172A', 
            color: 'white', 
            border: 'none', 
            fontWeight: 800, 
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
          }}
        >
          {isLastStep ? 'Create My Portfolio' : 'Continue'}
          <ChevronRight size={20} />
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Background Accents */}
      <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB08, #60A5FA05)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B05, #EC489905)', filter: 'blur(80px)', pointerEvents: 'none' }} />
    </div>
  );
}
