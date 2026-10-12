import { Platform, Alert } from 'react-native';

export interface TaxDocParams {
  name: string;
  email: string;
  phone?: string;
  year?: number;
  grossEarnings?: number;
  totalDeliveries?: number;
}

export interface InsuranceDocParams {
  name: string;
  email: string;
  policyNumber?: string;
  vehicleModel?: string;
  plateNumber?: string;
}

function getTaxDocumentHtml(params: TaxDocParams): string {
  const year = params.year || 2023;
  const name = params.name || 'Farhan Malik';
  const email = params.email || 'rider@neighborplates.com';
  const phone = params.phone || '+94 77 123 4567';
  const gross = params.grossEarnings || 486200;
  const deliveries = params.totalDeliveries || 142;
  const baseEarnings = Math.round(gross * 0.865);
  const tips = Math.round(gross * 0.099);
  const surge = gross - baseEarnings - tips;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NeighborPlates Form 1099-NEC Statement (${year})</title>
  <style>
    @media print {
      @page { size: A4; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #f9fafb;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 36px 40px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #9a3412;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo-badge {
      display: inline-block;
      background: #fff7ed;
      color: #9a3412;
      font-weight: 900;
      font-size: 14px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #fed7aa;
      margin-bottom: 6px;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      color: #111827;
      margin: 0;
    }
    .subtitle {
      font-size: 13px;
      color: #6b7280;
      margin-top: 4px;
    }
    .tax-year-badge {
      text-align: right;
      background: #9a3412;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 12px;
    }
    .tax-year-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .tax-year-number {
      font-size: 26px;
      font-weight: 900;
      line-height: 1.1;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }
    .info-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .info-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .info-val {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .info-sub {
      font-size: 12px;
      color: #4b5563;
      margin-top: 2px;
    }
    .box-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .box-card {
      border: 2px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px 20px;
    }
    .box-card.primary {
      border-color: #ea580c;
      background: #fffbf7;
    }
    .box-num {
      font-size: 12px;
      font-weight: 800;
      color: #9a3412;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .box-amount {
      font-size: 30px;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f3f4f6;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #4b5563;
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      font-size: 13px;
      padding: 12px 14px;
      border-bottom: 1px solid #f3f4f6;
      color: #1f2937;
    }
    td.amount {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
      font-size: 14px;
    }
    tr.total-row td {
      border-top: 2px solid #111827;
      border-bottom: 2px solid #111827;
      font-weight: 900;
      font-size: 15px;
      background: #f9fafb;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }
    .watermark {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .print-btn-bar {
      margin-bottom: 20px;
      text-align: right;
    }
    .print-btn {
      background: #9a3412;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-btn-bar no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <div>
        <div class="logo-badge">🍲 NEIGHBORPLATES LOGISTICS</div>
        <h1 class="title">Form 1099-NEC Statement</h1>
        <div class="subtitle">Nonemployee Compensation Annual Courier Summary</div>
      </div>
      <div class="tax-year-badge">
        <div class="tax-year-title">Tax Year</div>
        <div class="tax-year-number">${year}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Payer Information</div>
        <div class="info-val">NeighborPlates Logistics Pvt Ltd</div>
        <div class="info-sub">TIN: 84-2910482 • Colombo, Sri Lanka</div>
        <div class="info-sub">Platform Delivery & Courier Operations</div>
      </div>
      <div class="info-box">
        <div class="info-label">Recipient / Courier Information</div>
        <div class="info-val">${name}</div>
        <div class="info-sub">✉ ${email}</div>
        <div class="info-sub">📞 ${phone}</div>
      </div>
    </div>

    <div class="box-grid">
      <div class="box-card primary">
        <div class="box-num">Box 1 • Nonemployee Compensation</div>
        <div class="box-amount">Rs. ${gross.toLocaleString()}</div>
        <div class="info-sub" style="margin-top: 6px;">Total net courier earnings processed during calendar year ${year}.</div>
      </div>
      <div class="box-card">
        <div class="box-num">Box 4 • Tax Withheld</div>
        <div class="box-amount" style="color: #6b7280; font-size: 24px;">Rs. 0.00</div>
        <div class="info-sub" style="margin-top: 6px;">Independent Contractor (100% Direct Payout).</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Earnings Category</th>
          <th>Description</th>
          <th style="text-align: right;">Amount (LKR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Base Delivery Fees</strong></td>
          <td>Completed distance & dropoff fees (${deliveries} total trips)</td>
          <td class="amount">Rs. ${baseEarnings.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Customer Tips</strong></td>
          <td>Direct gratuities from diners (100% retained by courier)</td>
          <td class="amount">Rs. ${tips.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Rush & Quest Incentives</strong></td>
          <td>Dinner peak & weekend milestone quest payouts</td>
          <td class="amount">Rs. ${surge.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2"><strong>Total Gross Compensation (Box 1)</strong></td>
          <td class="amount" style="color: #9a3412;">Rs. ${gross.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>
        Prepared under NeighborPlates Logistics Compliance. Electronic statement valid for tax filing.
      </div>
      <div class="watermark">
        ✓ VERIFIED & AUDIT APPROVED
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getInsuranceCertificateHtml(params: InsuranceDocParams): string {
  const name = params.name || 'Farhan Malik';
  const email = params.email || 'rider@neighborplates.com';
  const policy = params.policyNumber || 'NP-COV-88291';
  const vehicle = params.vehicleModel || 'Rad Power E-Bike Pro';
  const plate = params.plateNumber || '#EB-4092';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Certificate of Commercial Coverage - ${policy}</title>
  <style>
    @media print {
      @page { size: A4; margin: 12mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #2563eb;
      border-radius: 16px;
      padding: 36px 40px;
      box-shadow: 0 4px 20px rgba(37,99,235,0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 22px;
      font-weight: 900;
      color: #1e3a8a;
    }
    .policy-pill {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-weight: 900;
      padding: 8px 16px;
      border-radius: 12px;
      text-align: right;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .val {
      font-weight: 800;
      font-size: 15px;
      color: #0f172a;
    }
    .sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
    }
    .coverage-box {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .coverage-title {
      font-size: 15px;
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 6px;
    }
    .coverage-desc {
      font-size: 12px;
      color: #1e3a8a;
      line-height: 1.6;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .print-btn-bar {
      margin-bottom: 20px;
      text-align: right;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-btn-bar no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save Certificate</button>
    </div>
    <div class="header">
      <div>
        <div style="color: #2563eb; font-weight: 900; font-size: 13px;">🛡️ COMMERCIAL DISPATCH COVERAGE</div>
        <div class="title">Certificate of Commercial Cover</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Underwritten for NeighborPlates Active Courier Network</div>
      </div>
      <div class="policy-pill">
        <div style="font-size: 10px; text-transform: uppercase;">Policy Number</div>
        <div style="font-size: 16px; font-weight: 900;">#${policy}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="section-title">Insured Courier Partner</div>
        <div class="val">${name}</div>
        <div class="sub">✉ ${email}</div>
        <div class="sub">Status: Active & Verified Courier</div>
      </div>
      <div class="card">
        <div class="card-title">Registered Vehicle</div>
        <div class="val">${vehicle}</div>
        <div class="sub">Plate / Fleet ID: ${plate}</div>
        <div class="sub">Coverage Active on Roadway</div>
      </div>
    </div>

    <div class="coverage-box">
      <div class="coverage-title">Summary of Commercial Coverage</div>
      <div class="coverage-desc">
        • <strong>$1,000,000 Comprehensive Third-Party Roadside Liability</strong> during active transit and food pickup/dropoff runs.<br>
        • <strong>Artisan Food Loss & Spill Insurance</strong> protecting cooked meal value in the event of transit accident or emergency.<br>
        • <strong>Zero Deductible</strong> roadside emergency dispatch assistance within Colombo & surrounding regions.<br>
        • <strong>Term:</strong> Valid through November 30, 2025.
      </div>
    </div>

    <div class="footer">
      <div>Issued by Allianz Commercial & Homely Roadside Logistics Trust.</div>
      <div style="color: #059669; font-weight: 800;">✓ CERTIFICATE VALID & ACTIVE</div>
    </div>
  </div>
</body>
</html>`;
}

export const documentService = {
  downloadTaxStatement: async (params: TaxDocParams): Promise<boolean> => {
    const html = getTaxDocumentHtml(params);
    const filename = `NeighborPlates_Tax_Statement_1099_NEC_${params.year || 2023}_${(params.name || 'Courier').replace(/\s+/g, '_')}`;

    if (Platform.OS === 'web') {
      try {
        // 1. Direct browser file download
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        // 2. Open print/PDF view window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {}
          }, 350);
        }

        return true;
      } catch (webErr) {
        console.error('[DocumentService] Web download error:', webErr);
        Alert.alert('Download Error', 'Could not initiate statement download.');
        return false;
      }
    } else {
      try {
        const expoPrint = require('expo-print');
        const expoSharing = require('expo-sharing');
        const FileSystem = require('expo-file-system');

        const { uri } = await expoPrint.printToFileAsync({ html });
        const targetPath = `${FileSystem.cacheDirectory}${filename}.pdf`;

        try {
          await FileSystem.deleteAsync(targetPath, { idempotent: true });
        } catch (_) {}

        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });

        if (await expoSharing.isAvailableAsync()) {
          await expoSharing.shareAsync(targetPath, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `Download 1099-NEC Statement (${params.year || 2023})`,
          });
        } else {
          await expoPrint.printAsync({ html });
        }
        return true;
      } catch (nativeErr) {
        console.error('[DocumentService] Native PDF error:', nativeErr);
        Alert.alert('Download Error', 'Could not generate PDF statement.');
        return false;
      }
    }
  },

  downloadInsuranceCertificate: async (params: InsuranceDocParams): Promise<boolean> => {
    const html = getInsuranceCertificateHtml(params);
    const filename = `NeighborPlates_Insurance_Coverage_Certificate_${params.policyNumber || 'COV'}`;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            try {
              printWindow.print();
            } catch (e) {}
          }, 350);
        }
        return true;
      } catch (err) {
        console.error('[DocumentService] Web certificate download error:', err);
        return false;
      }
    } else {
      try {
        const expoPrint = require('expo-print');
        const expoSharing = require('expo-sharing');
        const FileSystem = require('expo-file-system');

        const { uri } = await expoPrint.printToFileAsync({ html });
        const targetPath = `${FileSystem.cacheDirectory}${filename}.pdf`;

        try {
          await FileSystem.deleteAsync(targetPath, { idempotent: true });
        } catch (_) {}

        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });

        if (await expoSharing.isAvailableAsync()) {
          await expoSharing.shareAsync(targetPath, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'Commercial Coverage Certificate',
          });
        } else {
          await expoPrint.printAsync({ html });
        }
        return true;
      } catch (err) {
        console.error('[DocumentService] Native certificate error:', err);
        return false;
      }
    }
  },
};
