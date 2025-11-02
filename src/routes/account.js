const express = require('express')
const { login, loginWithGoogle, getProfile, register, getAllUsers, updateProfile, updateUserRole, changePassword } = require('../controllers/account');
const { verifyToken, authorize } = require('../middleware/authorization');
const usersRouter = express.Router();

usersRouter.post('/register', register);

usersRouter.post('/login', login)
usersRouter.post('/login-google', loginWithGoogle);

usersRouter.get("/profile", verifyToken, getProfile);
usersRouter.get('/', verifyToken, authorize('admin'), getAllUsers);
usersRouter.put('/profile', verifyToken, updateProfile);
usersRouter.put('/:id/role', verifyToken, authorize('admin'), updateUserRole);
usersRouter.post('/change-password', verifyToken, changePassword);

module.exports = usersRouter