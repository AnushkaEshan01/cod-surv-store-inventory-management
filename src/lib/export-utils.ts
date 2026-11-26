import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InventoryItem, TransactionLog, getStockStatus } from "@/types";

/**
 * Clean CSV string generator and browser file downloader
 */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows
      .map((row) =>
        row
          .map((item) => {
            const str = String(item ?? "").replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      )
      .join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export full inventory list to CSV
 */
export function exportInventoryToCSV(items: InventoryItem[]) {
  const headers = [
    "Item ID",
    "Item Name",
    "Category",
    "Quantity",
    "Unit",
    "Low Stock Threshold",
    "Status",
    "Last Updated",
    "Description",
  ];

  const rows = items.map((it) => {
    const status = getStockStatus(it.quantity, it.lowStockThreshold);
    return [
      it.id,
      it.itemName,
      it.category,
      it.quantity,
      it.unit || "units",
      it.lowStockThreshold,
      status.toUpperCase(),
      new Date(it.lastUpdated).toLocaleString(),
      it.description || "",
    ];
  });

  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`CodSurv_Inventory_${dateStr}.csv`, [headers, ...rows]);
}

/**
 * Export audit transaction logs to CSV
 */
export function exportTransactionsToCSV(logs: TransactionLog[]) {
  const headers = [
    "Log ID",
    "Timestamp",
    "Item Name",
    "Action",
    "Quantity Changed",
    "Admin User",
    "Notes",
  ];

  const rows = logs.map((log) => [
    log.id,
    new Date(log.timestamp).toLocaleString(),
    log.itemName,
    log.transactionType,
    log.amount,
    log.userEmail,
    log.notes || "",
  ]);

  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`CodSurv_Transaction_Audit_${dateStr}.csv`, [headers, ...rows]);
}

/**
 * Export report to CSV (With or Without logs)
 */
export function exportReportToCSV(
  items: InventoryItem[],
  logs: TransactionLog[],
  includeLogs: boolean = true
) {
  if (!includeLogs) {
    exportInventoryToCSV(items);
    return;
  }

  const headers = [
    "Record Type",
    "ID",
    "Item Name",
    "Category / Action",
    "Quantity / Amount",
    "Unit / Admin User",
    "Status / Timestamp",
    "Notes / Description",
  ];

  const inventoryRows = items.map((it) => {
    const status = getStockStatus(it.quantity, it.lowStockThreshold);
    return [
      "STOCK ITEM",
      it.id,
      it.itemName,
      it.category,
      it.quantity,
      it.unit || "units",
      status.toUpperCase(),
      it.description || "",
    ];
  });

  const logRows = logs.map((log) => [
    "AUDIT LOG",
    log.id,
    log.itemName,
    log.transactionType === "IN" ? "STOCK IN" : "STOCK OUT",
    log.amount,
    log.userEmail,
    new Date(log.timestamp).toLocaleString(),
    log.notes || "",
  ]);

  const dateStr = new Date().toISOString().split("T")[0];
  downloadCSV(`CodSurv_Inventory_With_Logs_${dateStr}.csv`, [
    headers,
    ...inventoryRows,
    ["--- MOVEMENT AUDIT LOGS ---", "", "", "", "", "", "", ""],
    ...logRows,
  ]);
}

/**
 * Generate Apple-style minimalist Weekly Inventory & Movement PDF Report
 */
export function exportWeeklyReportToPDF(
  items: InventoryItem[],
  logs: TransactionLog[],
  adminEmail: string,
  includeLogs: boolean = true
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Color palette - Apple Minimalist Dark/Grey/Accent
  const primaryColor: [number, number, number] = [17, 24, 39]; // zinc-900
  const secondaryColor: [number, number, number] = [107, 114, 128]; // zinc-500
  const accentBorder: [number, number, number] = [229, 231, 235]; // zinc-200

  // 1. Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text("COD SURV STORE", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(
    includeLogs
      ? "INVENTORY & STOCK MOVEMENT AUDIT REPORT"
      : "CURRENT STOCK INVENTORY REPORT",
    14,
    26
  );

  // Date and Metadata on the right
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 14, 20, { align: "right" });
  doc.text(`Admin: ${adminEmail}`, pageWidth - 14, 26, { align: "right" });

  // Divider Line
  doc.setDrawColor(...accentBorder);
  doc.setLineWidth(0.5);
  doc.line(14, 32, pageWidth - 14, 32);

  // 2. Summary KPI Metrics Box
  const totalItems = items.length;
  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);
  const lowStockCount = items.filter(
    (it) => it.quantity > 0 && it.quantity <= it.lowStockThreshold
  ).length;
  const outOfStockCount = items.filter((it) => it.quantity === 0).length;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Inventory Overview", 14, 40);

  // 4 mini summary boxes
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: "Total Items", val: totalItems.toString() },
    { label: "Total Units", val: totalUnits.toString() },
    { label: "Low Stock Alert", val: lowStockCount.toString() },
    { label: "Out of Stock", val: outOfStockCount.toString() },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, 44, boxWidth, 18, 2, 2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text(m.label, x + 4, 50);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text(m.val, x + 4, 58);
  });

  // 3. Current Stock Status Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Current Inventory Status", 14, 72);

  const inventoryTableBody = items.map((it) => {
    const status = getStockStatus(it.quantity, it.lowStockThreshold);
    let statusLabel = "IN STOCK";
    if (status === "low-stock") statusLabel = "LOW STOCK";
    if (status === "out-of-stock") statusLabel = "OUT OF STOCK";

    return [
      it.itemName,
      it.category,
      `${it.quantity} ${it.unit || ""}`,
      it.lowStockThreshold.toString(),
      statusLabel,
    ];
  });

  autoTable(doc, {
    startY: 76,
    head: [["Item Name", "Category", "Quantity", "Min Alert", "Status"]],
    body: inventoryTableBody,
    theme: "plain",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 30, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        if (data.cell.raw === "OUT OF STOCK") {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "LOW STOCK") {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [22, 101, 52]; // Green
        }
      }
    },
  });

  // 4. Recent Stock In/Out Transactions (Only if includeLogs is true)
  if (includeLogs && logs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalY = (doc as any).lastAutoTable?.finalY || 150;

    // If less than 60mm remaining on page, start a fresh page
    if (finalY > 210) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("Recent Transactions Audit Log", 14, finalY + 12);

    const recentLogs = logs.slice(0, 25);
    const logsTableBody = recentLogs.map((log) => [
      new Date(log.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      log.itemName,
      log.transactionType === "IN" ? "+ IN (Added)" : "- OUT (Issued)",
      log.amount.toString(),
      log.notes || "-",
    ]);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Date & Time", "Item Name", "Action", "Qty", "Remarks"]],
      body: logsTableBody,
      theme: "plain",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [51, 65, 85],
        lineColor: [241, 245, 249],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 65 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15, halign: "right" },
        4: { cellWidth: 40 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          if (String(data.cell.raw).startsWith("+")) {
            data.cell.styles.textColor = [22, 101, 52]; // Green
          } else {
            data.cell.styles.textColor = [185, 28, 28]; // Red
          }
        }
      },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text(
      `Cod Surv Store Inventory System — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      290,
      { align: "center" }
    );
  }

  const fileNameDate = now.toISOString().split("T")[0];
  const filePrefix = includeLogs
    ? "CodSurv_Inventory_With_Logs"
    : "CodSurv_Stock_Inventory_Summary";
  doc.save(`${filePrefix}_${fileNameDate}.pdf`);
}
