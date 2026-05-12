export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    alert("No data available to export");
    return;
  }
  
  // Get all unique keys across all objects to form headers
  const allKeys = data.reduce((keys, obj) => {
    Object.keys(obj).forEach(key => keys.add(key));
    return keys;
  }, new Set());
  const headers = Array.from(allKeys);
  
  const csvRows = [];
  // Add headers row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) val = '';
      
      // Handle objects/arrays (like items in an order)
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      
      const stringVal = String(val);
      // Escape for CSV
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
