/**
 * BookSaw - Digital PDF & E-Book Generator / Downloader Helper
 * Enables clients to download professional, formatted PDF copies of books.
 */

const PDFHelper = {
  /**
   * Triggers download of the book PDF
   * If book has a custom uploaded pdfUrl/data URI, downloads that directly.
   * Otherwise, generates a formatted PDF document on the fly.
   */
  async downloadBook(bookId) {
    const book = DB.getBook(parseInt(bookId));
    if (!book) {
      showToast('Book not found', 'error');
      return;
    }

    const currentUser = DB.getCurrentUser();
    const isPurchased = DB.isBookPurchased(book.id, currentUser ? currentUser.id : null);

    if (!isPurchased) {
      showToast('🔒 Full PDF download requires purchasing this book.', 'warning');
      const priceStr = typeof Currency !== 'undefined' ? Currency.formatSelected(book.priceUSD) : `$${book.priceUSD}`;
      if (confirm(`🔒 PDF Download Locked\n\n"${book.title}" is a premium digital e-book (${priceStr}).\n\nTo download the full PDF and read all pages offline, would you like to buy your copy now?`)) {
        if (typeof DB !== 'undefined' && DB.addToCart) DB.addToCart(book, 1);
        window.location.href = 'checkout.html';
      }
      return;
    }

    showToast('Preparing PDF download for "' + book.title + '"... ⏳', 'info');

    // Case 1: If there's an uploaded PDF (data URI or url)
    if (book.pdfUrl && (book.pdfUrl.startsWith('data:application/pdf') || book.pdfUrl.endsWith('.pdf'))) {
      const a = document.createElement('a');
      a.href = book.pdfUrl;
      a.download = this.getSafeFileName(book.title);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('📥 Download started: ' + book.title + '.pdf', 'success');
      return;
    }

    // Case 2: Generate PDF using jsPDF (dynamically load if needed)
    try {
      await this.loadJsPdf();
      this.generateAndDownloadPDF(book);
    } catch (err) {
      console.warn('jsPDF load failed, falling back to clean printable view/download', err);
      this.downloadFallbackPDF(book);
    }
  },

  getSafeFileName(title) {
    return (title || 'BookSaw_Book').replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_') + '_BookSaw.pdf';
  },

  loadJsPdf() {
    return new Promise((resolve, reject) => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF not available'));
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  generateAndDownloadPDF(book) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // ── Page 1: Cover Page ──
    // Header banner
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.rect(0, 0, pageWidth, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('BOOKSAW DIGITAL EDITION', margin, 35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('Official Multi-Device Digital E-Book', margin, 45);

    // Title & Author
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    const titleLines = doc.splitTextToSize(book.title || 'Untitled Book', contentWidth);
    doc.text(titleLines, margin, 95);

    const titleOffset = 95 + (titleLines.length * 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('by ' + (book.author || 'Unknown Author'), margin, titleOffset);

    // Metadata card
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, titleOffset + 15, contentWidth, 55, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('EDITION DETAILS', margin + 8, titleOffset + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Genre / Category: ' + (book.genre || book.category || 'General Literature'), margin + 8, titleOffset + 35);
    doc.text('Format: Digital PDF (BookSaw Digital Edition)', margin + 8, titleOffset + 42);
    doc.text('Language: English • Instant Delivery License', margin + 8, titleOffset + 49);
    doc.text('License: Personal, Non-Commercial DRM Reading License', margin + 8, titleOffset + 56);

    // Footer copyright
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('© BookSaw Digital Publishing. All rights reserved. Purchased via booksaw.com', margin, pageHeight - 15);

    // ── Page 2: Table of Contents & Description ──
    doc.addPage();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ABOUT THIS BOOK', margin, 17);

    let y = 38;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(book.description || 'No description provided.', contentWidth);
    doc.text(descLines, margin, y);

    y += (descLines.length * 6) + 15;

    // Table of contents
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('TABLE OF CONTENTS', margin, y);
    y += 10;

    const chapters = book.chapters || [
      { title: 'Chapter 1: The Beginning & Introduction', pages: '3-18' },
      { title: 'Chapter 2: Foundations & Core Principles', pages: '19-45' },
      { title: 'Chapter 3: The Turning Point', pages: '46-82' },
      { title: 'Chapter 4: Advanced Strategies & Deep Dive', pages: '83-140' },
      { title: 'Chapter 5: Resolution & Reflection', pages: '141-210' },
      { title: 'Epilogue & Author Notes', pages: '211-224' }
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    chapters.forEach((ch, idx) => {
      doc.text(`${idx + 1}. ${ch.title}`, margin, y);
      doc.text(`pp. ${ch.pages}`, pageWidth - margin - 20, y);
      y += 8;
    });

    // ── Page 3+: Chapters ──
    doc.addPage();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(book.title.toUpperCase(), margin, 17);

    y = 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('CHAPTER 1: THE OPENING HORIZON', margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    const chapter1Text = book.sampleContent || 
      `In every story worth telling, the starting point is marked by quiet curiosity. ` +
      `When we embark on this journey with "${book.title}", we discover that profound ideas ` +
      `often disguise themselves as simple observations.\n\n` +
      `Throughout the chapters ahead, armor yourself with an open mind and a willingness ` +
      `to challenge what you already know. The pages in your hands—whether read on a digital ` +
      `screen or printed out for personal study—represent hours of distilled insight from ` +
      `${book.author}.\n\n` +
      `"Knowledge is not merely acquired; it is absorbed, integrated, and transformed into action."\n\n` +
      `As you proceed through each section, take your time to reflect on each insight and make ` +
      `notes along the way. This digital edition is formatted specifically for smooth reading ` +
      `across phones, tablets, e-readers, and desktop devices.`;

    const c1Lines = doc.splitTextToSize(chapter1Text, contentWidth);
    doc.text(c1Lines, margin, y);

    // Save and download
    const fileName = this.getSafeFileName(book.title);
    doc.save(fileName);
    showToast('📥 Download completed: ' + fileName, 'success');
  },

  downloadFallbackPDF(book) {
    // Generate clean text/html printable Blob
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${book.title} - BookSaw PDF Edition</title>
        <style>
          body { font-family: Georgia, serif; max-width: 750px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a1a1a; }
          h1 { font-size: 32px; margin-bottom: 6px; }
          .author { font-size: 18px; color: #555; margin-bottom: 24px; font-style: italic; }
          .meta { background: #f4f4f4; padding: 16px; border-radius: 6px; font-family: sans-serif; font-size: 13px; margin-bottom: 30px; }
          .chapter-title { font-size: 22px; margin-top: 40px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
          p { margin: 16px 0; text-align: justify; }
          @media print { body { max-width: 100%; margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${book.title}</h1>
        <div class="author">by ${book.author}</div>
        <div class="meta">
          <strong>BookSaw Official Digital Edition</strong><br>
          Genre: ${book.genre || book.category} • Format: Digital E-Book • Licensed to Owner
        </div>
        <p><strong>Overview:</strong> ${book.description}</p>
        <h2 class="chapter-title">Chapter 1</h2>
        <p>${book.sampleContent || 'Welcome to the complete digital edition of ' + book.title + '. This book contains full digital reading rights on the BookSaw platform.'}</p>
        <script>window.print();<\/script>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      showToast('Opened printable PDF reader view', 'info');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = this.getSafeFileName(book.title).replace('.pdf', '.html');
      a.click();
    }
  }
};

window.PDFHelper = PDFHelper;
