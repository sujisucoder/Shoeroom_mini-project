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
//middleware noCache 
const noCache = (req, res, next)=>{
   

  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
  next()
}

/* GET home page. */
router.get('/',noCache,  async(req, res, next) => {
    //use no cache here
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

router.get('/login',noCache, (req, res) => {
  //use no cache here

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

router.get('/product-details/:id', verifyLogin, async(req, res)=>{
  user = req.session.user
  console.log("user:"+user._id);
  cartCount = await userHelpers.getCartCount(user._id)
  console.log("cart:"+cartCount);

  products = await userHelpers.getDetailsOnProduct(req.params.id)
  console.log(products);
  res.render('usersPage/product-details',{products, user, cartCount})
})

router.get('/cart',verifyLogin, async(req,res)=>{
  let products = await userHelpers.getAllProductOnUser(req.session.user._id)
  let totalValue = 0
  if (products.length>0) {
     totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  }

  res.render('userspage/cart',{products, user:req.session.user, totalValue})
})

router.get('/add-to-cart/:id', (req, res)=>{
 userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{
  res.json({status:true})
 }) 
  
})

router.post('/change-product-quantity',(req,res,next)=>{

  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
   
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
}),

router.post('/remove-product',(req,res)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
   
    res.json(response)
  })

}),

router.get('/place-order',verifyLogin,async(req,res)=>{
  let total = await userHelpers.getTotalAmount(req.session.user._id)
   
  res.render('userspage/place-order',{total,user:req.session.user})
})

router.post('/place-order', async(req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId)=>{
    if (req.body['payment-method']==='COD') {
      res.json({codSuccess:true})    
    }else{
      userHelpers.generateRazorpay(orderId, totalPrice).then((response)=>{
        res.json(response)
      })
    }
  
  })

  
})

router.get('/order-success',(req,res)=>{
  res.render('userspage/order-success',{user:req.session.user._id})
})

router.get('/orders-list', async(req,res)=>{
  let orders = await userHelpers.getUserOrderList(req.session.user._id)
  res.render('usersPage/orders-list', {user:req.session.user, orders})
  
})

router.get('/view-order-products/:id',async(req,res)=>{
  console.log(req.params.id);
  let products =await userHelpers.orderProducts(req.params.id)
  console.log(products);
   res.render('UsersPage/view-order-products',{products})
})

router.post('/verify-payment', (req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('payment successful');
      res.json({status:true})
    })
  }).catch((err)=>{
      res.json({status:false,errMsg:''})
  })
})



module.exports = router;
