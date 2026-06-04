import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * OptimizedImage
 * Automatically injects Cloudinary fetch params (f_auto, q_auto) for images hosted on Cloudinary,
 * provides blur placeholders, and handles lazy loading (Native + IntersectionObserver polyfill).
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  className, 
  style, 
  width, 
  height, 
  objectFit = 'cover',
  borderRadius = 0,
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Automatically enforce WebP/AVIF (f_auto) and quality compression (q_auto) if it's a Cloudinary URL
  const getOptimizedSrc = (url) => {
    if (!url) return url;
    if (url.includes('res.cloudinary.com') && !url.includes('f_auto') && !url.includes('q_auto')) {
      // Split the URL to inject transformations before the public ID
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_auto,q_auto,w_${width || 'auto'}/${parts[1]}`;
      }
    }
    return url;
  };

  const optimizedSrc = getOptimizedSrc(src);

  return (
    <div 
      className={className} 
      style={{ 
        ...style, 
        width, 
        height, 
        position: 'relative', 
        overflow: 'hidden', 
        borderRadius,
        background: '#F5EFEB' // subtle placeholder color
      }}
    >
      {/* Skeleton / Blur Placeholder */}
      {!isLoaded && (
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #F5EFEB, #FFFDF9, #F5EFEB)',
            backgroundSize: '200% 100%',
          }}
        />
      )}
      
      {/* Actual Image */}
      {optimizedSrc && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            display: 'block'
          }}
        />
      )}
    </div>
  );
}
