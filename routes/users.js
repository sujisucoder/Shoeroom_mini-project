const { response } = require('express');
const express = require('express');

const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

// middleware
const verifyLogin = (req, res, next)=>{
if(req.session.loggedIn){
next()
}else{
  res.redirect('/login')
}
}
/* GET home page. */
router.get('/', (req, res, next) => {
  let user = req.session.user
  productHelpers.getAllProductOnAdmin().then((products) => {
    res.render('usersPage/view-home', { products, user });
  });
});

router.get('/users', (req, res) => {
  res.render('usersPage/view-home');
});

router.get('/login', (req, res) => {
  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
  if (req.session.loggedIn) {
    res.redirect('/')
    
  }else
  
    res.render('userspage/login',{error:req.session.loggError});
    req.session.loggError = false
  
  });

router.get('/signup', (req, res) => {
  res.render('userspage/signup');
});
 
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response)=>{
    res.render('userspage/login')
  });
});


router.post('/login', (req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.loggedIn =true
      req.session.user = response.user
      res.redirect('/')
      
    }else{
      req.session.loggError = true
      res.redirect('/login')
    }
  })

})

router.get('/logout', (req,res)=>{
  req.session.destroy()
  res.redirect('/')
})

router.get('/cart',verifyLogin, (req,res)=>{
  let user = req.session.user
  res.render('userspage/cart',{user})
})



module.exports = router;
