const express = require('express');
const router = express.Router();
const {
  getCompanies,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
} = require('../controller/companyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All company routes protected

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .put(updateCompany)
  .delete(deleteCompany);

router.patch('/:id/toggle-status', toggleCompanyStatus);

module.exports = router;
