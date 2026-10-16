const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const emailValidation = body('email')
  .isEmail().withMessage('Email must be valid')
  .normalizeEmail();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  emailValidation,
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validateRequest,
], authController.register);

router.post('/login', [
  emailValidation,
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest,
], authController.login);

router.get('/me', authMiddleware, authController.me);

module.exports = router;
