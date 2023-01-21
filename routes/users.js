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
  //to prevent logout using back button 
  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
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
// {
//   'payment[razorpay_payment_id]': 'pay_L5uvZRNLuMvZal',        
//   'payment[razorpay_order_id]': 'order_L5uvQ9uBMn9lX5',        
//   'payment[razorpay_signature]': '0745591ea1ddd675abcda40a412b4668277653e6fc9adea5aebed26db258c8c5',
//   'order[id]': 'order_L5uvQ9uBMn9lX5',
//   'order[entity]': 'order',
//   'order[amount]': '23695',
//   'order[amount_paid]': '0',
//   'order[amount_due]': '23695',
//   'order[currency]': 'INR',
//   'order[receipt]': '63c8d22d1d7d73f06430788b',
//   'order[offer_id]': '',
//   'order[status]': 'created',
//   'order[attempts]': '0',
//   'order[created_at]': '1674105390'
// }
