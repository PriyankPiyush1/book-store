const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const passport = require('passport');
const checkAuthentication = require('../middleware/checkAuthentication');
const Book = require('../models/Book');
const nodemailer = require('nodemailer');

// Get Route For Register
router.get('/register', (req, res)=>{
    res.render('users/register');
});
// Post Route For Users Reister
router.post('/register', async (req, res) => {
    const foundDuplicate = async(email) => {
        try {
            const duplicate = await User.findOne({ email: email });
            if (duplicate) return true;
            return false;
        } catch (e) {
            console.log(e);
            return false;
        }
    };
    const errors = [];
    const nameRagex = /^[a-zA-Z ]*$/;
    const emailRagex = /^[a-zA-Z0-9\-_]+(\.[a-zA-Z0-9\-_]+)*@[a-z0-9]+(\-[a-z0-9]+)*(\.[a-z0-9]+(\-[a-z0-9]+)*)*\.[a-z]{2,4}$/;
    const newUser = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    };
    if (!nameRagex.test(newUser.name)) {
        errors.push({
            msg: `Name doesn't Contain any number or a special Charecter.`
        });
    }
    if (!emailRagex.test(newUser.email)) {
        errors.push({
            msg: `Email is not Valid. Please enter a valid Email.`
        });
    }
    if (newUser.password.length < 6) {
        errors.push({
            msg: `Password must contain atleast 6 Characters`
        });
    }
    if (await foundDuplicate(newUser.email)) {
        errors.push({
            msg: `Email is already Registered`
        });
    }
    if (errors.length > 0) {
        res.render('users/register', { errors: errors, newUser: newUser });
    } else {
        try {
            const hashedPassword = await bcrypt.hash(newUser.password, 10);
            try {
                const savedUser = new User({
                    name: newUser.name,
                    email: newUser.email,
                    password: hashedPassword
                });
                await savedUser.save();
                req.flash('success', 'You are now Registered');
                // Mail Options
                const msg = `
                        <h2 style="color: rgb(90, 10, 219);">Hello, ${savedUser.name}</h2>
                        <h4 style="font-style: italic;">You are now a Customer of our <strong>BOOK STORE</strong></h4>
                        <p>You can now login and shopinng with us!!</p>
                        

                        <h5>Thank you</h5>
                        <h6>Admin, Book Store</h6>
                        <img src="https://cdn3.iconfinder.com/data/icons/book-shop-category-ouline/512/Book_Shop_Category-10-512.png" alt="" style="height: 3em; width: 3em; border-radius: 50%">
                        `
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'nilanjan1729reso@gmail.com',
                        pass: '#Nil1729@nodejs'
                    }
                });
                const mailOptions = {
                    from: '"BOOK STORE" <nilanjan1729reso@gmail.com>',
                    to: savedUser.email,
                    subject: 'Register on BOOK STORE',
                    text: 'Welcome to Book Store',
                    html: msg
                };
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        return console.log(error);
                    }
                    console.log("Message sent: %s", info.messageId);
                    res.redirect('/users/login');
                });
                // ================
                
            } catch (e) {
                res.render('users/register', { errors: { msg: 'Internal Server Error' }, newUser: newUser });
            }
        } catch (e) {
            res.render('users/register', { errors: { msg: 'Internal Server Error' }, newUser: newUser });
        }
    }
});


// Users Login Route
router.get('/login', (req, res) => {
    res.render('users/login');
});

// Users Login Post Route
router.post('/login',passport.authenticate('local', {
    successFlash: true,
    successRedirect:'/books',
    failureFlash: true,
    failureRedirect:'/users/login'
}) ,(req, res) => {});

router.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/books');
});

// Cart Route
router.put('/cart/:id',  checkAuthentication , async (req, res)=>{
    try{
        const book = await Book.findById(req.params.id);
        const user = req.user;
        user.carts.push(book);
        User.findByIdAndUpdate(user.id, user, (err, savedUser)=>{
            if(err){
                console.log(err);
                res.redirect('back');
            }else{
                 res.redirect('/users/dashboard');
            }
        });
    }catch(e){
        console.log(e);
         res.redirect('back');
    }
});

// Delete Item
router.delete('/cart/:id/delete', checkAuthentication , async (req, res) => {
    try{
        const user = await User.findById(req.user.id);
        const index = user.carts.findIndex(book => book.equals(req.params.id));
        user.carts.splice(index, 1);
        User.findByIdAndUpdate(user.id, user, (err, savedUser)=>{
            if(err){
                console.log(err);
                res.redirect('back');
            }else{
                 res.redirect('/users/dashboard');
            }
        });
    }catch(e){
        console.log(e);
        res.redirect('back');
    }
});
// Dashboard
router.get('/dashboard', checkAuthentication ,(req, res) => {
    if(req.user.role !== 'admin'){
        User.findById(req.user.id).populate("carts").exec((err, user)=>{
            if(err){
                res.redirect('/books');
            }else{
                res.render('users/dashboard', {user: user});
            }
        });
    }else{
         res.redirect('/admin');
    }
});

module.exports = router;