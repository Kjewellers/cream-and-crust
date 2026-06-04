const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/components/demos');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = [
  [/caption:\s*['"]Apne business ki growth yahan dekho['"]/g, "caption: 'Watch your business growth here'"],
  [/caption:\s*['"]Cash, UPI, online .*? kahan se kitna aaya['"]/g, "caption: 'Track income across Cash, UPI, and Online'"],
  [/caption:\s*['"]PDF report download karke save karo['"]/g, "caption: 'Download and save professional PDF reports'"],
  [/caption:\s*['"]Saare orders calendar pe dikhte hai['"]/g, "caption: 'View all your orders on a single calendar'"],
  [/caption:\s*['"]Din pe tap karo .*? us din ke orders dekho['"]/g, "caption: 'Tap on a day to see its scheduled orders'"],
  [/caption:\s*['"]Busy din pe app pehle hi prep ka alert deta hai['"]/g, "caption: 'Get smart prep alerts before busy days'"],
  [/caption:\s*['"]Har customer ki history yahan save rehti hai['"]/g, "caption: 'Access complete history for every customer'"],
  [/caption:\s*['"]Ek tap me Call, WhatsApp ya Navigate karo['"]/g, "caption: 'Call, WhatsApp, or Navigate with one tap'"],
  [/caption:\s*['"]Purana order dobara banana\? "Order again" dabao['"]/g, "caption: 'Want to repeat an order? Just tap \"Order again\"'"],
  [/caption:\s*['"]Yahan aapke business ki sab info dikhti hai['"]/g, "caption: 'Everything about your business at a glance'"],
  [/caption:\s*['"]Quick Actions se turant kaam karo['"]/g, "caption: 'Use Quick Actions to work faster'"],
  [/caption:\s*['"]Aaj ki deliveries ek jagah dikhti hai['"]/g, "caption: 'All of today\\'s deliveries in one place'"],
  [/caption:\s*['"]Har kharcha yahan note karo['"]/g, "caption: 'Log every business expense easily'"],
  [/caption:\s*['"]Category aur amount bharke save karo['"]/g, "caption: 'Select a category, enter amount, and save'"],
  [/caption:\s*['"]Profit khud calculate hota hai['"]/g, "caption: 'Net profit is calculated automatically'"],
  [/caption:\s*['"]Apna stock track karo .*? kya khatam ho raha hai['"]/g, "caption: 'Track your inventory to see what\\'s running low'"],
  [/caption:\s*['"]Stock kam ho to app khud alert deta hai['"]/g, "caption: 'Get auto-alerts when stock is low'"],
  [/caption:\s*['"]Order banao to stock khud kam ho jaata hai['"]/g, "caption: 'Stock deducts automatically when orders are placed'"],
  [/caption:\s*['"]Apna online menu banao .*? 24\/7 orders lo['"]/g, "caption: 'Create your online menu to get orders 24/7'"],
  [/caption:\s*['"]5 products add karke publish karo['"]/g, "caption: 'Add 5 products and hit publish'"],
  [/caption:\s*['"]Link Instagram & WhatsApp bio me daalo['"]/g, "caption: 'Share your link in your Instagram & WhatsApp bio'"],
  [/caption:\s*['"]Naya order banane ke liye \+ dabao['"]/g, "caption: 'Tap + to create a new order'"],
  [/caption:\s*['"]Customer ka naam aur number bharo['"]/g, "caption: 'Enter the customer\\'s name and phone number'"],
  [/caption:\s*['"]Cake details aur weight chuno['"]/g, "caption: 'Choose the product details and weight'"],
  [/caption:\s*['"]Amount bharo, balance khud calculate hoga['"]/g, "caption: 'Enter the amount, balance is calculated automatically'"],
  [/caption:\s*['"]Order ban gaya! Ab WhatsApp pe bhej do['"]/g, "caption: 'Order created! Send the receipt via WhatsApp'"],
  [/caption:\s*['"]Apne products yahan add karo['"]/g, "caption: 'Add your beautiful products here'"],
  [/caption:\s*['"]Photo daalo, naam aur price likho['"]/g, "caption: 'Upload a photo, add name and price'"],
  [/caption:\s*['"]Save karo .*? menu pe apne aap dikhega['"]/g, "caption: 'Save it — it automatically appears on your menu'"],
  [/caption:\s*['"]Apni recipes safe rakho .*? costing ke saath['"]/g, "caption: 'Keep your recipes safe — with full costing'"],
  [/caption:\s*['"]Batch scale karo .*? sab khud adjust hoga['"]/g, "caption: 'Use the batch scaler — everything adjusts instantly'"],
  [/caption:\s*['"]Shopping list ek tap me ban jaati hai['"]/g, "caption: 'Generate a shopping list with just one tap'"],
];

let totalChanges = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Finished updating ${totalChanges} files.`);
