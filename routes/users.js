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
router.get('/', async(req, res, next) => {
  let user = req.session.user
  let cartCount = null
  if (user) {
     cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProductOnAdmin().then((products) => {
    res.render('usersPage/view-home', { products, user, cartCount });
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
    req.session.loggedIn = true
    req.session.user = response 
    res.redirect('/login')
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

router.get('/cart',verifyLogin, async(req,res)=>{
  let products = await userHelpers.getAllProductOnUser(req.session.user._id)
  console.log(products);
  res.render('userspage/cart',{products, user:req.session.user})
})

router.get('/add-to-cart/:id', (req, res)=>{
 userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{
  res.json({status:true})
 }) 
  
})

router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body);

  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    // response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
}),

router.post('/remove-product',(req,res)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json(response)
  })

})


module.exports = router;
