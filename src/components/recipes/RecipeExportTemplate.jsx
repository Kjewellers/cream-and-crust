import React, { forwardRef } from 'react';
import { 
  Calendar, Tag, Clock, ChefHat, Info, ThermometerSun, Users, 
  Droplets, Flame, CheckCircle, Lightbulb, Box, Coffee, ShieldAlert,
  Scale, ShoppingCart
} from 'lucide-react';

const RecipeExportTemplate = forwardRef(({ recipe }, ref) => {
  if (!recipe) return null;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const recipeId = recipe.id || 'CC-REC-024';

  const dryIngs = recipe.ingredients?.slice(0, Math.ceil(recipe.ingredients.length / 2)) || [];
  const wetIngs = recipe.ingredients?.slice(Math.ceil(recipe.ingredients.length / 2)) || [];

  return (
    <div 
      ref={ref} 
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '794px', // A4 width
        minHeight: '1123px', // A4 height
        background: '#fff',
        fontFamily: "'Inter', sans-serif",
        color: '#4A3B32',
        boxSizing: 'border-box',
        border: '12px solid #FDF2F8', // Outer document frame
        padding: '24px 32px'
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #FCE7F3', paddingBottom: '16px', marginBottom: '20px' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, background: '#FFF1F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              <path d="M6 5v14"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#9F1239', fontFamily: "'Georgia', serif", letterSpacing: '-0.02em', lineHeight: 1 }}>Cream & Crust</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#888', textTransform: 'uppercase', marginTop: 2 }}>Bakery Studio</div>
          </div>
        </div>
        
        {/* Center Tagline */}
        <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '24px', color: '#831843', textAlign: 'center', alignSelf: 'center', paddingRight: '20px' }}>
          Bake beautifully,<br/>Create joy daily. <span style={{ color: '#F43F5E' }}>♡</span>
        </div>

        {/* Export Info Box */}
        <div style={{ border: '1px solid #FCE7F3', borderRadius: '8px', overflow: 'hidden', width: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #FCE7F3' }}>
            <Calendar size={14} color="#F43F5E" style={{ marginRight: 8 }} />
            <div>
              <div style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase' }}>Exported On:</div>
              <div style={{ fontSize: '10px', fontWeight: 600 }}>{dateStr} | {timeStr}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: '#FFF1F2' }}>
            <Tag size={14} color="#F43F5E" style={{ marginRight: 8 }} />
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#831843' }}>
              Recipe ID: <span style={{ color: '#E11D48' }}>{recipeId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        
        {/* Left: Title, Desc, Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#4A151C', fontFamily: "'Georgia', serif", margin: '0 0 12px 0', lineHeight: 1.1 }}>{recipe.name}</h1>
          <p style={{ fontSize: '12px', color: '#444', lineHeight: '1.6', margin: '0 0 20px 0', maxWidth: '90%' }}>
            {recipe.notes || 'A rich, moist chocolate cake layered with silky chocolate ganache and finished with premium truffle shavings.'}
          </p>

          {/* Quick Stats Grid */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            {[
              { icon: <Info size={20}/>, label: 'Eggless', val: recipe.tags?.includes('Eggless') ? 'Yes' : 'No' },
              { icon: <ChefHat size={20}/>, label: 'Difficulty', val: recipe.difficulty || 'Medium' },
              { icon: <Clock size={20}/>, label: 'Prep Time', val: recipe.prepTime || '30 mins' },
              { icon: <ThermometerSun size={20}/>, label: 'Bake Time', val: recipe.bakeTime || '45 mins' },
              { icon: <Scale size={20}/>, label: 'Yield', val: recipe.yield || '1 kg Cake' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ color: '#E11D48' }}>{stat.icon}</div>
                <div style={{ fontSize: '9px', color: '#666', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#333' }}>{stat.val}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(recipe.tags || ['Chocolate', 'Bestseller', 'Premium', 'Birthday Special']).map(tag => (
              <span key={tag} style={{ background: '#FFF1F2', color: '#E11D48', border: '1px solid #FECDD3', padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Cake Image */}
        <div style={{ width: '300px', height: '200px', flexShrink: 0 }}>
          <img 
            src={recipe.imageUrl || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} 
            alt="Recipe" 
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* ── LEFT COLUMN (Ingredients & Instructions) ── */}
        <div style={{ flex: 1 }}>
          
          {/* Ingredients */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#E11D48', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              <div style={{ width: 24, height: 24, background: '#FFF1F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Box size={14} /></div>
              INGREDIENTS
            </h3>
            
            <div style={{ display: 'flex', fontSize: '10px', fontWeight: 700, color: '#888', borderBottom: '1px dotted #FCE7F3', paddingBottom: '6px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>Ingredient</div>
              <div style={{ width: '60px', textAlign: 'center' }}>Quantity</div>
              <div style={{ width: '60px', textAlign: 'center' }}>Unit</div>
            </div>

            {/* Dry Ingredients */}
            <div style={{ background: '#FFF1F2', color: '#831843', fontSize: '9px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>DRY INGREDIENTS</div>
            {dryIngs.map((ing, i) => (
              <div key={i} style={{ display: 'flex', fontSize: '11px', padding: '6px 0', alignItems: 'center', borderBottom: '1px dotted rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                  <div style={{ width: 16, height: 16, background: '#F3F4F6', borderRadius: '50%' }} /> {ing.name}
                </div>
                <div style={{ width: '60px', textAlign: 'center', fontWeight: 600 }}>{ing.qty}</div>
                <div style={{ width: '60px', textAlign: 'center', color: '#666' }}>{ing.unit}</div>
              </div>
            ))}

            {/* Wet Ingredients */}
            <div style={{ background: '#FFF1F2', color: '#831843', fontSize: '9px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', margin: '16px 0 8px 0', display: 'inline-block' }}>WET INGREDIENTS</div>
            {wetIngs.map((ing, i) => (
              <div key={i} style={{ display: 'flex', fontSize: '11px', padding: '6px 0', alignItems: 'center', borderBottom: '1px dotted rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                  <Droplets size={14} color="#888" /> {ing.name}
                </div>
                <div style={{ width: '60px', textAlign: 'center', fontWeight: 600 }}>{ing.qty}</div>
                <div style={{ width: '60px', textAlign: 'center', color: '#666' }}>{ing.unit}</div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF1F2', padding: '12px 16px', borderRadius: '8px', marginTop: '20px' }}>
              <div style={{ color: '#E11D48', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={16} /> Total Ingredients</div>
              <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '18px', color: '#F43F5E' }}>Makes {recipe.yield}</div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#E11D48', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
              <div style={{ width: 24, height: 24, background: '#FFF1F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={14} /></div>
              INSTRUCTIONS
            </h3>
            {(recipe.steps || []).map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#FFF1F2', color: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: '11px', lineHeight: '1.5', color: '#444', paddingTop: 3 }}>
                  {step.desc || step.title}
                </div>
                {step.timer && (
                  <div style={{ fontSize: '10px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, paddingTop: 3 }}>
                    <Clock size={12} /> {step.timer}
                  </div>
                )}
                {/* Fallback timer if string matches digits mins */}
                {!step.timer && (step.desc?.match(/\d+\s*min/) || step.title?.match(/\d+\s*min/)) && (
                  <div style={{ fontSize: '10px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, paddingTop: 3 }}>
                    <Clock size={12} /> {step.desc?.match(/(\d+\s*min)/)?.[1] || step.title?.match(/(\d+\s*min)/)?.[1]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Baker's Tip */}
          <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', padding: '20px', borderRadius: '12px', marginTop: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Lightbulb size={18} color="#E11D48" />
              <h4 style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '24px', color: '#E11D48', margin: 0 }}>Baker's Tip</h4>
            </div>
            <p style={{ fontSize: '11px', color: '#4A151C', margin: 0, lineHeight: 1.6, maxWidth: '85%' }}>
              Do not open the oven door in the first 30 minutes of baking. This ensures a perfect rise and prevents sinking in the center.
            </p>
          </div>

        </div>

        {/* ── RIGHT COLUMN (Boxes) ── */}
        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '16px', background: '#FFFDFE' }}>
            <h3 style={{ fontSize: '11px', color: '#E11D48', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 800 }}>
              <ChefHat size={14} /> CHEF NOTES
            </h3>
            <ul style={{ margin: 0, paddingLeft: '0', fontSize: '10px', color: '#555', lineHeight: 1.6, listStyle: 'none' }}>
              {['Use room temperature ingredients for a smooth and even batter.', 'Do not overmix after adding flour.', 'For extra moisture, add 1 tbsp of hot water to the batter.', 'This cake stays soft and moist for days!'].map((note, i) => (
                <li key={i} style={{ position: 'relative', paddingLeft: '16px', marginBottom: '8px' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, color: '#F43F5E', fontSize: '12px' }}>♡</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '11px', color: '#E11D48', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 800 }}>
              <Flame size={14} /> DECORATION & FROSTING
            </h3>
            <ul style={{ margin: 0, paddingLeft: '0', fontSize: '10px', color: '#555', lineHeight: 1.6, listStyle: 'none' }}>
              {['Frost with chocolate ganache or chocolate buttercream.', 'Decorate with truffle shavings, chocolate curls or sprinkles.', 'Best served slightly chilled for a rich truffle experience.'].map((note, i) => (
                <li key={i} style={{ position: 'relative', paddingLeft: '16px', marginBottom: '8px' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, color: '#F43F5E', fontSize: '12px' }}>♡</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '16px', background: '#FFFDFE' }}>
            <h3 style={{ fontSize: '11px', color: '#E11D48', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 800 }}>
              <Box size={14} /> STORAGE & SHELF LIFE
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dotted #FCE7F3' }}>
              <span style={{ color: '#555' }}>Refrigerated Shelf Life</span>
              <span style={{ fontWeight: 600 }}>5 Days</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dotted #FCE7F3' }}>
              <span style={{ color: '#555' }}>Room Temperature</span>
              <span style={{ fontWeight: 600 }}>1 Day</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '12px' }}>
              <span style={{ color: '#555' }}>Freezer Friendly</span>
              <span style={{ fontWeight: 600 }}>Yes (1 Month)</span>
            </div>
            <div style={{ fontSize: '10px', color: '#444' }}>
              <strong style={{ display: 'block', marginBottom: 2 }}>Storage Instructions:</strong>
              Store in an airtight container. Refrigerate for extended shelf life.
            </div>
          </div>

          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '11px', color: '#E11D48', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 800 }}>
              <Coffee size={14} /> SERVING SUGGESTIONS
            </h3>
            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
              Serve slightly chilled for the best taste. Pairs beautifully with coffee, hot chocolate or a scoop of vanilla ice cream.
            </div>
          </div>

          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '16px', background: '#FFF1F2' }}>
            <h3 style={{ fontSize: '11px', color: '#E11D48', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 800 }}>
              <ShieldAlert size={14} /> ALLERGEN INFORMATION
            </h3>
            <div style={{ fontSize: '10px', color: '#555' }}>
              Contains: Milk, Wheat<br/>
              <span style={{ color: '#888' }}>May contain traces of: Nuts, Soy</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid #FCE7F3', marginTop: '32px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', background: '#E5E5EA', borderRadius: '4px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 700 }}>
            QR<br/>Code
          </div>
          <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.4 }}>
            Scan to view this recipe<br/>in your app
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#E11D48', fontWeight: 700, fontSize: '11px', marginBottom: '4px', letterSpacing: '0.05em' }}>www.creamandcrust.com</div>
          <div style={{ fontSize: '9px', color: '#888' }}>📸 @creamandcrust.studio</div>
        </div>

        <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: '24px', color: '#F43F5E', textAlign: 'right', lineHeight: 1.1 }}>
          Thank you for baking<br/>with love! <span style={{ fontSize: 16 }}>♡</span>
        </div>
      </div>
    </div>
  );
});

export default RecipeExportTemplate;
