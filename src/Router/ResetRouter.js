const express = require('express');
const resetrouter = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const User = require('../Model/UserModel');

// Load environment variables from .env file
dotenv.config();

// Request password reset
resetrouter.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  console.log(email)
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found');

    // Generate JWT token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update user with reset token details
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log('hai',process.env.EMAIL)
    console.log('hai',user.email)

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
        to: user.email,
        from: process.env.EMAIL,
        subject: 'Password Reset',
        html: `<p>You requested a password reset</p><p>Click this <a href="${resetUrl}">link</a> to reset your password</p>`,
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send('Error sending email');
        }
        console.log('Email sent:', info.response);
        res.send('Password reset email sent');
      });
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).send('Server error');
    }
  });


resetrouter.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    console.log('hello',token)
    const { password } = req.body;
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({
        _id: decoded.userId,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) return res.status(400).send('Invalid or expired token');
  
      // Hash new password and update user
    //   const salt = await bcrypt.genSalt(10);
    //   user.password = await bcrypt.hash(password, salt);
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
      res.send('Password has been reset');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).send('Token expired');
      }
      res.status(500).send('Server error');
    }
  });
  
  module.exports = resetrouter;