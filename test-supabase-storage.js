const fs = require('fs');
const path = require('path');
const { validatePdf, generateSecureFileName } = require('./src/utils/fileValidation');
const supabaseService = require('./src/services/supabaseService');
const config = require('./src/config/config');

async function runTests() {
  console.log('🧪 Starting Supabase Storage & PDF Security Test Suite...\n');

  const tempDir = path.resolve(__dirname, 'uploads/pdfs');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // Test 1: Generate Secure Filename
  console.log('--- Test 1: Secure Filename Generation ---');
  const secureName = generateSecureFileName('My Great Book (Final Draft) #1.pdf', 'book');
  console.log('Generated filename:', secureName);
  if (secureName.startsWith('book_') && secureName.endsWith('.pdf') && !secureName.includes(' ') && !secureName.includes('#')) {
    console.log('✅ Test 1 Passed: Filename sanitized and secured.\n');
  } else {
    throw new Error('❌ Test 1 Failed: Filename not sanitized properly');
  }

  // Test 2: PDF Magic Bytes & Validation - Valid PDF
  console.log('--- Test 2: Validation of Genuine PDF ---');
  const validPdfPath = path.join(tempDir, 'test-valid.pdf');
  const validPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  fs.writeFileSync(validPdfPath, validPdfContent);

  const validResult = validatePdf(validPdfPath, 'test-valid.pdf', 'application/pdf');
  console.log('Valid PDF check result:', validResult);
  if (validResult.valid && validResult.size === validPdfContent.length) {
    console.log('✅ Test 2 Passed: Valid PDF signature correctly accepted.\n');
  } else {
    throw new Error('❌ Test 2 Failed: Valid PDF was rejected');
  }

  // Test 3: PDF Magic Bytes & Validation - Fake PDF (Spoofed Extension)
  console.log('--- Test 3: Fake PDF Signature Detection ---');
  const fakePdfPath = path.join(tempDir, 'test-fake.pdf');
  fs.writeFileSync(fakePdfPath, Buffer.from('This is a fake text file disguised as pdf!'));

  const fakeResult = validatePdf(fakePdfPath, 'test-fake.pdf', 'application/pdf');
  console.log('Fake PDF check result:', fakeResult);
  if (!fakeResult.valid && fakeResult.error.includes('Invalid file signature')) {
    console.log('✅ Test 3 Passed: Fake PDF successfully blocked by magic bytes inspection.\n');
  } else {
    throw new Error('❌ Test 3 Failed: Fake PDF was not blocked');
  }

  // Test 4: PDF Magic Bytes & Validation - Wrong Extension
  console.log('--- Test 4: Invalid Extension Detection ---');
  const txtPath = path.join(tempDir, 'test-text.txt');
  fs.writeFileSync(txtPath, Buffer.from('hello'));
  const extResult = validatePdf(txtPath, 'test-text.txt', 'text/plain');
  console.log('Extension check result:', extResult);
  if (!extResult.valid && extResult.error.includes('.pdf')) {
    console.log('✅ Test 4 Passed: Non-PDF extension blocked.\n');
  } else {
    throw new Error('❌ Test 4 Failed: Wrong extension was not blocked');
  }

  // Test 5: Client Configuration Verification
  console.log('--- Test 5: Supabase Configuration Verification ---');
  console.log('Supabase URL configured:', config.supabase.url ? 'YES (' + config.supabase.url + ')' : 'NO');
  console.log('Supabase Bucket configured:', config.supabase.bucket);
  console.log('Supabase Service Role Key present in config:', config.supabase.serviceRoleKey ? 'YES (configured)' : 'NO (empty or anon key)');
  const client = supabaseService.getSupabaseClient();
  if (client) {
    console.log('✅ Test 5 Passed: Supabase client initialized.\n');
  } else {
    console.log('⚠️ Test 5 Notice: Supabase client not initialized (missing credentials).\n');
  }

  // Test 6: Verify uploadPdf rejects validation failures without contacting storage
  console.log('--- Test 6: uploadPdf Rejection on Invalid Content ---');
  const uploadValidationTest = await supabaseService.uploadPdf(fakePdfPath, 'test-fake.pdf', 'application/pdf');
  console.log('uploadPdf validation rejection:', uploadValidationTest);
  if (!uploadValidationTest.success && uploadValidationTest.isValidation) {
    console.log('✅ Test 6 Passed: uploadPdf blocked invalid file before touching network.\n');
  } else {
    throw new Error('❌ Test 6 Failed: uploadPdf did not reject invalid file');
  }

  // Clean up scratch files
  try { if (fs.existsSync(validPdfPath)) fs.unlinkSync(validPdfPath); } catch {}
  try { if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath); } catch {}
  try { if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath); } catch {}

  console.log('🎉 ALL SUPABASE STORAGE & VALIDATION UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
