import React, { forwardRef } from 'react';

const RecipeExportTemplate = forwardRef(({ recipe }, ref) => {
  if (!recipe) return null;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = today.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Use a short display ID derived from recipe name
  const recipeIdDisplay =
    'CC-' + (recipe.name || 'REC').replace(/\s+/g, '').slice(0, 6).toUpperCase();

  const ingredients = (recipe.ingredients || []).filter((i) => i && typeof i === 'object');
  const steps = (recipe.steps || []).filter((s) => s && typeof s === 'object');

  // Dynamic allergen detection
  const ingStr = JSON.stringify(ingredients).toLowerCase();
  const detectedAllergens = [];
  if (
    ingStr.includes('nut') ||
    ingStr.includes('almond') ||
    ingStr.includes('peanut') ||
    ingStr.includes('cashew')
  )
    detectedAllergens.push('Tree Nuts');
  if (
    ingStr.includes('milk') ||
    ingStr.includes('cream') ||
    ingStr.includes('butter') ||
    ingStr.includes('buttermilk') ||
    ingStr.includes('cheese')
  )
    detectedAllergens.push('Dairy');
  if (ingStr.includes('egg')) detectedAllergens.push('Eggs');
  if (ingStr.includes('flour') || ingStr.includes('wheat') || ingStr.includes('maida'))
    detectedAllergens.push('Gluten / Wheat');
  if (ingStr.includes('soy')) detectedAllergens.push('Soy');
  if (ingStr.includes('sesame') || ingStr.includes('til')) detectedAllergens.push('Sesame');
  const allergenText =
    detectedAllergens.length > 0 ? detectedAllergens.join(', ') : 'None detected';
  const mayContainItems = ['Nuts', 'Soy', 'Sesame'].filter((a) => !allergenText.includes(a));
  const mayContainText = mayContainItems.slice(0, 2).join(', ');

  // Cost calculation
  const ingCost = ingredients.reduce((s, i) => s + Number(i.cost || 0), 0);
  const overhead =
    Number(recipe.packaging || 40) +
    Number(recipe.gas || 25) +
    Number(recipe.labor || 80) +
    Number(recipe.other || 11);
  const platformFee = recipe.platformFee || 5;
  const platformAmt = (ingCost + overhead) * (platformFee / 100);
  const totalCost = ingCost + overhead + platformAmt;
  const sellPrice = Number(recipe.sellPrice || 0);
  const profit = sellPrice - totalCost;
  const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

  // Decoration tips derived from category
  const category = (recipe.category || '').toLowerCase();
  let decorationTips = [];
  if (category.includes('cake')) {
    decorationTips = [
      'Frost with ganache, buttercream, or whipped cream.',
      'Decorate with fresh fruit, edible flowers, or chocolate shavings.',
      'Chill before slicing for clean, sharp layers.',
    ];
  } else if (category.includes('cupcake')) {
    decorationTips = [
      'Pipe swirled buttercream or cream cheese frosting on top.',
      'Add sprinkles, fondant shapes, or a cherry on top.',
      'Serve at room temperature for best texture.',
    ];
  } else if (category.includes('brownie')) {
    decorationTips = [
      'Dust with icing sugar or cocoa powder.',
      'Drizzle with melted chocolate for a glossy finish.',
      'Top with a sprinkle of sea salt before serving.',
    ];
  } else if (category.includes('cookie')) {
    decorationTips = [
      'Dip half the cookie in melted chocolate.',
      'Decorate with royal icing or sprinkles.',
      'Bake in batches and cool on a wire rack.',
    ];
  } else {
    decorationTips = [
      'Garnish with fresh herbs or edible flowers.',
      'Finish with a dusting of icing sugar or cocoa.',
      'Present in a clean, airtight container for freshness.',
    ];
  }

  // Serving suggestions derived from category
  let servingSuggestions = '';
  if (category.includes('cake')) {
    servingSuggestions = `Serve slightly chilled for the cleanest slices. Pairs beautifully with a scoop of vanilla ice cream, hot chocolate, or a fresh fruit coulis. Ideal for ${recipe.yield || 'one serving'}.`;
  } else if (category.includes('cupcake')) {
    servingSuggestions = `Best served at room temperature. Arrange on a tiered stand for events. Pairs well with milk, tea, or hot chocolate. Yields ${recipe.yield || 'several pieces'}.`;
  } else if (category.includes('brownie')) {
    servingSuggestions = `Serve warm with a scoop of vanilla ice cream for an indulgent experience. Can be cut into squares and packed in parchment paper for gifting. Yields ${recipe.yield || 'one batch'}.`;
  } else {
    servingSuggestions = `Best enjoyed fresh. Pairs well with tea or coffee. Yields ${recipe.yield || 'one serving'}. Store properly for maximum freshness.`;
  }

  // Baker's tip derived from notes or generic
  const bakerTip =
    recipe.notes ||
    (category.includes('cake')
      ? 'Do not open the oven door in the first 25 minutes of baking. This ensures a perfect rise and prevents sinking in the center.'
      : category.includes('cupcake')
        ? 'Fill liners only 2/3 full — cupcakes rise as they bake. Use an ice cream scoop for uniform portions.'
        : category.includes('brownie')
          ? 'Do not overbake. Brownies continue to set as they cool. Pull out of oven when center is just set.'
          : 'Follow the steps carefully and measure all ingredients precisely for the best results.');

  const cellStyle = {
    display: 'flex',
    fontSize: '11px',
    padding: '6px 0',
    alignItems: 'center',
    borderBottom: '1px dotted rgba(0,0,0,0.06)',
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '794px',
        background: '#fff',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        color: '#3A2820',
        boxSizing: 'border-box',
        border: '10px solid #FDF2F8',
        padding: '28px 36px',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #FCE7F3',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Logo Block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 46,
              height: 46,
              background: 'linear-gradient(135deg, #FFF1F2, #FECDD3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            🧁
          </div>
          <div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#9F1239',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              Cream &amp; Crust
            </div>
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '0.18em',
                color: '#B06070',
                textTransform: 'uppercase',
                marginTop: 3,
              }}
            >
              Bakery Studio · Recipe Card
            </div>
          </div>
        </div>

        {/* Center tagline */}
        <div
          style={{
            fontSize: '13px',
            color: '#831843',
            textAlign: 'center',
            alignSelf: 'center',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          Bake beautifully,
          <br />
          Create joy daily. <span style={{ color: '#F43F5E' }}>♡</span>
        </div>

        {/* Export Info Box */}
        <div
          style={{
            border: '1px solid #FECDD3',
            borderRadius: '8px',
            overflow: 'hidden',
            minWidth: '200px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderBottom: '1px solid #FECDD3',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>📅</span>
            <div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Exported On
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#333' }}>
                {dateStr} · {timeStr}
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 12px',
              background: '#FFF1F2',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>🏷️</span>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9F1239' }}>
              ID: <span style={{ color: '#E11D48' }}>{recipeIdDisplay}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* Left: Title + Stats */}
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#4A151C',
              margin: '0 0 10px 0',
              lineHeight: 1.1,
            }}
          >
            {recipe.name}
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#555',
              lineHeight: 1.7,
              margin: '0 0 18px 0',
              maxWidth: '95%',
            }}
          >
            {recipe.notes ||
              `A ${recipe.category || 'bakery'} recipe. Made with love by Cream & Crust Bakery Studio. Yields ${recipe.yield || 'as specified'}.`}
          </p>

          {/* Quick Stats Row — text only, no SVG icons */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              {
                emoji: '🥚',
                label: 'Eggless',
                val: (recipe.tags || []).some((t) => t.toLowerCase().includes('eggless'))
                  ? 'Yes'
                  : 'No',
              },
              { emoji: '👨‍🍳', label: 'Difficulty', val: recipe.difficulty || 'Medium' },
              { emoji: '⏱️', label: 'Prep Time', val: recipe.prepTime || '—' },
              { emoji: '🔥', label: 'Bake Time', val: recipe.bakeTime || '—' },
              { emoji: '⚖️', label: 'Yield', val: recipe.yield || '—' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  minWidth: 60,
                }}
              >
                <div style={{ fontSize: '18px' }}>{stat.emoji}</div>
                <div
                  style={{
                    fontSize: '8px',
                    color: '#999',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{ fontSize: '10px', fontWeight: 800, color: '#333', textAlign: 'center' }}
                >
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          {/* Tags */}
          {(recipe.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(recipe.tags || []).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    background: '#FFF1F2',
                    color: '#E11D48',
                    border: '1px solid #FECDD3',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '9px',
                    fontWeight: 700,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Image */}
        <div style={{ width: '260px', height: '190px', flexShrink: 0 }}>
          <img
            src={
              recipe.imageUrl ||
              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'
            }
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '12px',
              display: 'block',
            }}
            alt={recipe.name}
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* ── TWO COLUMN BODY ── */}
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* ── LEFT COLUMN: Ingredients + Instructions ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* INGREDIENTS */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#E11D48',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📦</span> INGREDIENTS
            </div>

            {/* Column headers */}
            <div
              style={{
                display: 'flex',
                fontSize: '9px',
                fontWeight: 700,
                color: '#999',
                borderBottom: '1.5px solid #FCE7F3',
                paddingBottom: '5px',
                marginBottom: '6px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ flex: 1 }}>Ingredient</div>
              <div style={{ width: '55px', textAlign: 'center' }}>Qty</div>
              <div style={{ width: '40px', textAlign: 'center' }}>Unit</div>
              <div style={{ width: '55px', textAlign: 'right' }}>Cost (₹)</div>
            </div>

            {ingredients.length > 0 ? (
              ingredients.map((ing, i) => (
                <div key={i} style={{ ...cellStyle }}>
                  <div
                    style={{
                      flex: 1,
                      color: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: i % 2 === 0 ? '#FFF1F2' : '#F0FDF4',
                        flexShrink: 0,
                      }}
                    />
                    {ing.name}
                  </div>
                  <div
                    style={{ width: '55px', textAlign: 'center', fontWeight: 600, color: '#444' }}
                  >
                    {ing.qty}
                  </div>
                  <div style={{ width: '40px', textAlign: 'center', color: '#777' }}>
                    {ing.unit}
                  </div>
                  <div
                    style={{ width: '55px', textAlign: 'right', fontWeight: 700, color: '#C2410C' }}
                  >
                    ₹{Number(ing.cost || 0).toFixed(0)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '11px', color: '#aaa', padding: '8px 0' }}>
                No ingredients listed.
              </div>
            )}

            {/* Totals row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #FFF1F2, #FCE7F3)',
                padding: '10px 14px',
                borderRadius: '8px',
                marginTop: '10px',
              }}
            >
              <div style={{ color: '#9F1239', fontWeight: 700, fontSize: '10px' }}>
                📋 Total Ingredients · Makes {recipe.yield || '—'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#E11D48' }}>
                ₹{ingCost.toFixed(0)}
              </div>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#E11D48',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📋</span> INSTRUCTIONS
            </div>

            {steps.length > 0 ? (
              steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FFF1F2',
                      color: '#E11D48',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 800,
                      flexShrink: 0,
                      border: '1.5px solid #FECDD3',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {step.title && (
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2D1B14',
                          marginBottom: 3,
                        }}
                      >
                        {step.title}
                      </div>
                    )}
                    <div style={{ fontSize: '10.5px', lineHeight: 1.55, color: '#555' }}>
                      {step.desc || step.title}
                    </div>
                    {step.timer && (
                      <div
                        style={{
                          marginTop: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#FFF7ED',
                          color: '#C2410C',
                          borderRadius: 5,
                          padding: '2px 7px',
                          fontSize: '9px',
                          fontWeight: 700,
                        }}
                      >
                        ⏱ {step.timer}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '11px', color: '#aaa', padding: '8px 0' }}>
                No steps listed.
              </div>
            )}
          </div>

          {/* BAKER'S TIP */}
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '14px 16px',
              borderRadius: '10px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#D97706',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              💡 Baker's Tip
            </div>
            <p style={{ fontSize: '10.5px', color: '#78350F', margin: 0, lineHeight: 1.6 }}>
              {bakerTip}
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Side Boxes ── */}
        <div
          style={{
            width: '265px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* COST BREAKDOWN */}
          <div
            style={{
              border: '1px solid #FECDD3',
              borderRadius: '12px',
              padding: '14px',
              background: '#FFF5F7',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>💰</span> COST &amp; PROFIT
            </div>
            {[
              ['Ingredients', ingCost],
              ['Packaging', recipe.packaging || 40],
              ['Gas / Electricity', recipe.gas || 25],
              ['Labor', recipe.labor || 80],
              [`Platform Fee (${platformFee}%)`, platformAmt],
              ['Other Costs', recipe.other || 11],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9.5px',
                  marginBottom: '5px',
                  color: '#555',
                }}
              >
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: '#333' }}>₹{Number(val).toFixed(0)}</span>
              </div>
            ))}
            <div
              style={{
                borderTop: '1px solid #FECDD3',
                marginTop: '6px',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                fontWeight: 800,
              }}
            >
              <span style={{ color: '#9F1239' }}>Total Cost</span>
              <span style={{ color: '#E11D48' }}>₹{totalCost.toFixed(0)}</span>
            </div>
            {sellPrice > 0 && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    marginTop: 4,
                    color: '#555',
                  }}
                >
                  <span>Selling Price</span>
                  <span style={{ fontWeight: 700, color: '#333' }}>₹{sellPrice.toFixed(0)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    fontWeight: 900,
                    marginTop: 4,
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: profit >= 0 ? '#DCFCE7' : '#FEE2E2',
                    color: profit >= 0 ? '#15803D' : '#DC2626',
                  }}
                >
                  <span>Profit</span>
                  <span>
                    ₹{profit.toFixed(0)} ({margin.toFixed(0)}%)
                  </span>
                </div>
              </>
            )}
          </div>

          {/* DECORATION & FINISHING */}
          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '14px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>✨</span> DECORATION &amp; FINISHING
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                fontSize: '10px',
                color: '#555',
                lineHeight: 1.6,
              }}
            >
              {decorationTips.map((tip, i) => (
                <li
                  key={i}
                  style={{ paddingLeft: '14px', marginBottom: '6px', position: 'relative' }}
                >
                  <span
                    style={{ position: 'absolute', left: 0, color: '#F43F5E', fontSize: '10px' }}
                  >
                    ♡
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* STORAGE & SHELF LIFE */}
          <div
            style={{
              border: '1px solid #FCE7F3',
              borderRadius: '12px',
              padding: '14px',
              background: '#FAFEFF',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>📦</span> STORAGE &amp; SHELF LIFE
            </div>
            {[
              ['Refrigerated', '3–5 Days'],
              ['Room Temperature', '1 Day'],
              ['Freezer', 'Up to 1 Month'],
            ].map(([label, val]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9.5px',
                  marginBottom: '6px',
                  paddingBottom: '5px',
                  borderBottom: '1px dotted #FCE7F3',
                }}
              >
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ fontWeight: 700, color: '#333' }}>{val}</span>
              </div>
            ))}
            <div style={{ fontSize: '9.5px', color: '#666', lineHeight: 1.5, marginTop: 4 }}>
              Store in an airtight container. Refrigerate in warm weather for best quality.
            </div>
          </div>

          {/* SERVING SUGGESTIONS */}
          <div style={{ border: '1px solid #FCE7F3', borderRadius: '12px', padding: '14px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>☕</span> SERVING SUGGESTIONS
            </div>
            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.6 }}>
              {servingSuggestions}
            </div>
          </div>

          {/* ALLERGEN INFORMATION */}
          <div
            style={{
              border: '1px solid #FECDD3',
              borderRadius: '12px',
              padding: '14px',
              background: '#FFF1F2',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#E11D48',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>⚠️</span> ALLERGEN INFO
            </div>
            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.7 }}>
              <strong style={{ color: '#9F1239' }}>Contains:</strong> {allergenText}
            </div>
            {mayContainText && (
              <div style={{ fontSize: '9.5px', color: '#888', marginTop: 4 }}>
                May contain traces of: {mayContainText}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          borderTop: '1.5px solid #FCE7F3',
          marginTop: '28px',
          paddingTop: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: '#F3F4F6',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#888',
              fontWeight: 700,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            QR
            <br />
            Code
          </div>
          <div style={{ fontSize: '9.5px', color: '#666', lineHeight: 1.5 }}>
            Scan to view
            <br />
            this recipe in app
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              color: '#E11D48',
              fontWeight: 800,
              fontSize: '11px',
              marginBottom: '3px',
              letterSpacing: '0.04em',
            }}
          >
            app.creamandcrust.in
          </div>
          <div style={{ fontSize: '9px', color: '#999' }}>📸 @creamandcrust.studio</div>
        </div>

        <div
          style={{
            fontSize: '13px',
            color: '#F43F5E',
            textAlign: 'right',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          Thank you for baking
          <br />
          with love! <span style={{ fontSize: 15 }}>♡</span>
        </div>
      </div>
    </div>
  );
});

export default RecipeExportTemplate;
