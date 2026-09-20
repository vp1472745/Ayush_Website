import express from 'express';
import {
  getCompanies,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
} from '../controller/companyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All company routes protected

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .put(updateCompany)
  .delete(deleteCompany);

router.patch('/:id/toggle-status', toggleCompanyStatus);

export default router;
