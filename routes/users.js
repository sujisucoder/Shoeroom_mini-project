const { response } = require('express');
const express = require('express');
const { FeedbackSummaryList } = require('twilio/lib/rest/api/v2010/account/call/feedbackSummary');

const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const { AwsInstance } = require('twilio/lib/rest/accounts/v1/credential/aws');

// middleware
const verifyLogin = (req, res, next)=>{
if(req.session.userLoggedIn){
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

// otp
router.get('/otp-login', noCache, (req, res)=>{

  if (req.session.userLoggedIn) {
     user = req.session.user
    res.redirect('/')

    
  }else{
   
      let logErr = req.session.userLoggError
      res.render('usersPage/otp-add-number',{logErr})
    
   
  
  }
  
 
})

router.post('/otp-login',noCache, (req, res)=>{
   userHelpers.getDetailsOnOtp(req.body.phone).then((response)=>{
    // console.log(response)
  
    let phone = req.body.phone
    
    if(response.phoneFound){
      
      req.session.user = response.dbPhone
      res.render('usersPage/otp-add-otp',{phone})
    }else{
      
      req.session.userLoggError = true
      res.redirect('/otp-login')
    }

   })

   router.post('/verify-otp', (req, res)=>{
    let otp = req.body.otp
    let phone = req.body.phone
    
    userHelpers.verifyOtp(phone,otp).then((response)=>{
    
      if(response){
  
        req.session.userLoggedIn = true
        res.redirect('/otp-login')
      
      }else{
        req.session.userLoggError = true
        res.redirect('/otp-login')
      }
    })
   })

  
})



/* GET home page. */
router.get('/',noCache,  async(req, res, next) => {
    //use no cache here
  let user =  req.session.user
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

  if (req.session.userLoggedIn) {
    res.redirect('/')
    
  }else
  
    res.render('userspage/login',{error:req.session.userLoggError});
    req.session.userLoggError = false
  
  });



router.post('/login', (req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.userLoggedIn =true
      req.session.user = response.user
      res.redirect('/')
      
    }else{
      req.session.userLoggError = true
      res.redirect('/login')
    }
  })

})  

router.get('/signup', (req, res) => {
  res.render('userspage/signup');
});
 
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response)=>{
    req.session.userLoggedIn = true
    req.session.user = response 
    res.redirect('/login')
  });
});




router.get('/logout', (req,res)=>{
  req.session.destroy()
  res.redirect('/')
})

router.get('/product-details/:id', async(req, res)=>{
  user = req.session.user
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)

  }else{
    cartCount = 0
  }
  

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

router.get('/add-to-cart/:id',verifyLogin, (req, res)=>{
 userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{
  res.json({status:true})
 }) 
  
})

router.get('/add-to-cart-product-details/:id',verifyLogin, (req, res)=>{
  userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{
   
    res.redirect('/cart')
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

router.get('/user-profile', verifyLogin, async(req, res)=>{

 let user = req.session.user
 let getAddress = await userHelpers.getUserAddress(req.session.user._id)
  res.render('usersPage/user-profile', {user,getAddress})
})



router.get('/add-address', verifyLogin, (req, res)=>{
  res.render('usersPage/address-add')
})

router.post('/add-profile-address', verifyLogin, async(req, res)=>{
 
  let user = req.session.user
   let address = await userHelpers.addUserAddress(req.body,req.session.user._id).then(()=>{
  res.redirect('/user-profile')
   })
 
 })

 router.get('/update-profile/:id', verifyLogin, async(req, res)=>{

    console.log(req.params.id)
    let user = req.session.user
    let address = await userHelpers.getUserAddressForUpdate(req.params.id)
      res.render('usersPage/update-profile',{address,user})
   

 
 })

 router.post('/update-profile', (req, res)=>{

  // console.log(req.body)
  userHelpers.updateUserAddress(req.body,req.body.addressId)
  res.redirect('/user-profile')
 })

router.get('/orders-home',verifyLogin, async(req, res)=>{
   let order =await adminHelpers.getOrderCount()
   let cartCount = await userHelpers.getCartCount(req.session.user._id)
   res.render('usersPage/orders-home',{order,cartCount})
})

module.exports = router;
