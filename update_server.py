import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update AI_MODEL
content = re.sub(
    r"const AI_MODEL = process.env.OPENROUTER_MODEL \|\| 'openai/gpt-oss-120b:free';",
    "const AI_MODEL_PRIMARY = process.env.OPENROUTER_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free';\nconst AI_MODEL_FALLBACK = 'openai/gpt-oss-120b:free';",
    content
)

# 2. Update context length limit
content = content.replace(
    'JSON.stringify(context, null, 0).slice(0, 3500)',
    'JSON.stringify(context, null, 0).slice(0, 6000)'
)

# 3. Replace fetch block in /api/ai/chat
old_fetch_pattern = re.compile(
    r"    const response = await fetch\('https://openrouter.ai/api/v1/chat/completions', \{.*?res\.json\(parseAIResponse\(aiText\)\);\n  \} catch \(error\) \{",
    re.DOTALL
)

new_fetch_block = """    const buildMsgs = () => [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-8).map(h => ({
        role: h.role === 'ai' ? 'assistant' : 'user',
        content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
      })),
      { role: 'user', content: userMessage },
    ];

    const orFetch = (key, model) => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://creamandcrust.app',
        'X-Title': 'Cream & Crust AI',
      },
      body: JSON.stringify({ model, messages: buildMsgs(), temperature: 0.65, max_tokens: 3000 }),
    });

    let response = await orFetch(apiKey, AI_MODEL_PRIMARY);
    if (!response.ok && response.status !== 401) response = await orFetch(apiKey, AI_MODEL_FALLBACK);
    if (!response.ok && AI_KEYS.length > 1) {
      const key2 = getNextAIKey();
      response = await orFetch(key2, AI_MODEL_PRIMARY);
      if (!response.ok) response = await orFetch(key2, AI_MODEL_FALLBACK);
    }
    if (!response.ok) {
      return res.status(502).json({ error: 'AI service temporarily unavailable', response: 'AI abhi busy hai, thodi der mein try karein.' });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';
    res.json(parseAIResponse(aiText));
  } catch (error) {"""

content = old_fetch_pattern.sub(new_fetch_block, content)

# 4. Update AVAILABLE ACTIONS and INSIGHTS PROTOCOL inside buildSystemPrompt
old_actions = """AVAILABLE ACTIONS:
- create_order: { customerName, phone, product, size, price, deliveryDate, deliveryTime, deliveryAddress, deliveryType, notes }
- update_order_status: { orderId, status } (statuses: "new"|"confirmed"|"in-progress"|"ready"|"delivered"|"cancelled")
- delete_order: { orderId }
- add_inventory: { item, stock, unit, minStock, expiryDate, cost }
- update_inventory_stock: { itemId, stock }
- add_customer: { name, phone, address, dob }
- add_expense: { title, amount, category }
- add_shopping_item: { item, qty, unit, estimatedCost }
- add_product: { name, price, category, description }
- add_recipe: { name, category, yield, prepTime, bakeTime, ingredients: [{name, qty, unit}], steps: [{title, desc}] }
- navigate: { to }
- add_memory: { note } / delete_memory: { memoryId }
- send_whatsapp_invoice: { orderId }
- export_data: { target: "orders"|"expenses"|"customers" }
- change_theme: { theme: "dark"|"light" }"""

new_actions = """AVAILABLE ACTIONS:
- create_order: { customerName, phone, product, size, price, qty, deliveryDate, deliveryTime, deliveryAddress, deliveryType, notes }
- update_order_status: { orderId, status } (statuses: "new"|"confirmed"|"in-progress"|"baking"|"ready"|"delivered"|"cancelled") — NO confirm needed for status-only changes
- mark_paid: { orderId } — mark order payment as paid — NO confirm needed
- batch_status_update: { status, orderIds: [] } — update multiple orders at once
- delete_order: { orderId }
- add_inventory: { item, stock, unit, minStock, expiryDate, cost }
- update_inventory_stock: { itemId, stock } — itemId must be exact Firestore ID from context
- add_customer: { name, phone, address, dob }
- add_expense: { title, amount, category, date, vendor, notes }
- add_shopping_item: { item, qty, unit, estimatedCost }
- add_product: { name, price, category, description }
- add_recipe: { name, category, yield, prepTime, bakeTime, ingredients: [{name, qty, unit}], steps: [{title, desc}] }
- navigate: { to } — navigate without confirmation
- add_memory: { note } / delete_memory: { memoryId }
- send_whatsapp_invoice: { orderId }
- export_data: { target: "orders"|"expenses"|"customers" }
- change_theme: { theme: "dark"|"light" }
- multi_action: { actions: [{ type, data }] } — run multiple actions in sequence"""

content = content.replace(old_actions, new_actions)

old_insights = """INSIGHTS PROTOCOL — For analytical/generative requests set state=ready, action=null, populate insights:
1. Recipe: { type:"recipe_generator", recipe:{ name, yield, cost, prepTime, bakeTime, ingredients:[{item,qty,unit}], steps:[] } }
2. Inventory: { type:"inventory_assistant", summary, shortages:[{item,stock,reason}], expiring:[{item,date}] }
3. Coach: { type:"bakery_coach", revenue, profit, bestSellers:[], weakProducts:[], advice } — use COMPUTED BUSINESS SUMMARY numbers.
4. Marketing: { type:"marketing_campaign", message, target, hashtags:[] }
5. Payments: { type:"payment_status", pendingAmount, pendingOrders:[{customer,amount,orderId}] }
6. Charts: { type:"chart", chartType:"bar"|"line", data:[{name,value}] }
7. Product descriptions: { type:"product_descriptions", items:[{id,name,description}] }"""

new_insights = """INSIGHTS PROTOCOL — For analytical/generative requests set state=ready, action=null, populate insights:
1. Recipe: { type:"recipe_generator", recipe:{ name, yield, cost, prepTime, bakeTime, ingredients:[{item,qty,unit}], steps:[] } }
2. Inventory: { type:"inventory_assistant", summary, shortages:[{item,stock,reason}], expiring:[{item,date}] }
3. Coach: { type:"bakery_coach", revenue, profit, bestSellers:[], weakProducts:[], advice } — use COMPUTED BUSINESS SUMMARY numbers.
4. Marketing: { type:"marketing_campaign", message, target, hashtags:[] }
5. Payments: { type:"payment_status", pendingAmount, pendingOrders:[{customer,amount,orderId,id}] }
6. Charts: { type:"chart", chartType:"bar"|"line", data:[{name,value}] }
7. Product descriptions: { type:"product_descriptions", items:[{id,name,description}] }
8. Orders list: { type:"orders_list", orders:[{id,orderId,customerName,product,total,status,paymentStatus,deliveryDate}] }
9. Customers list: { type:"customers_list", customers:[{id,name,phone,totalOrders}] }
10. Run My Bakery: { type:"run_bakery", priorities:[{task,reason,urgency,action}], summary }

IMPORTANT — For "show me orders", "list unpaid orders", "find Priya's orders" etc: use type:"orders_list" and populate with REAL order data from context. NEVER say you can't show data — just render it.

QUICK ACTION RULES (no confirmation needed, execute immediately):
- "Mark CC-001 as delivered" → action: { type:"update_order_status", data:{ orderId:"<id>", status:"delivered" }, confirmRequired: false }
- "Mark CC-001 as paid" → action: { type:"mark_paid", data:{ orderId:"<id>" }, confirmRequired: false }
- "Go to orders" / "Open inventory" → action: { type:"navigate", data:{ to:"/orders" }, confirmRequired: false }
- "Dark mode" / "Light mode" → action: { type:"change_theme", data:{ theme:"dark" }, confirmRequired: false }
- "Show unpaid orders" → insights: { type:"orders_list", orders:[...filtered from context] }

OrderId resolution: ALWAYS look up the order ID from context.orders by orderId field (like "CC-001") and use the Firestore document id field."""

content = content.replace(old_insights, new_insights)

with open('server.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('Updated server.js')
