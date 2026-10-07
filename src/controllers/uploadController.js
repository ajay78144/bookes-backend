const uploadImageFile = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    const cleanUrl = `/uploads/covers/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      filename: req.file.filename,
      url: cleanUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};

const uploadPdfFile = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded.'
      });
    }

    const cleanUrl = `/uploads/pdfs/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'PDF document uploaded successfully.',
      filename: req.file.filename,
      url: cleanUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadImageFile,
  uploadPdfFile
};
