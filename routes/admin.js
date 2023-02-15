const express = require('express');

const productHelpers = require('../helpers/product-helpers');
const adminHelpers = require('../helpers/admin-helpers')
const { route } = require('./users');
const excelJs = require("exceljs");
const { response } = require('../app');
const { AwsInstance } = require('twilio/lib/rest/accounts/v1/credential/aws');

const router = express.Router();

const verifyAdminLogin = (req, res, next)=>{
  if (req.session.adminLoggedIn) {
    next()
    
  }else{
    res.redirect('/admin')
  }
}

const noCache = (req, res, next)=>{
   

  res.header(
    "Cache-control",
    "no-cache,private, no-store, must-revalidate,max-stale=0,post-check=0"
  );
  next()
}

/* GET users listing. */
router.get('/',noCache, (req, res, next) => {
 if (req.session.adminLoggedIn) {
  let admin = req.session.admin
  res.render('adminPage/view-home',{admin,adminHeader:true} );  
 }else{
  res.render('adminPage/admin-login',{ adminHeader:false, error:req.session.adminLogErr  })
   req.session.adminLogErr = false
 }  
  
});

router.post('/',(req, res)=>{

  adminHelpers.doAdminLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.adminLoggedIn = true
      req.session.admin = response.admin
      console.log(req.session.admin);
      res.redirect('/admin/view-home')
      
    }else{
     req.session.adminLogErr = true
      res.redirect('/admin')

    }
  })
})

router.get('/admin-logout', (req, res)=>{

  req.session.destroy()
  res.redirect('/admin')

})

router.get('/view-home',verifyAdminLogin, async(req, res)=>{
    
  let admin = req.session.admin
  let allCount = {}
  allCount.userCount = await adminHelpers.getUserCount()
  allCount.productCount = await adminHelpers.getProductCount()
  allCount.salesCount = await adminHelpers.getSalesCount()
  allCount.orderCount = await adminHelpers.getOrderCount()
  console.log(allCount);

  res.render('adminPage/view-home',{admin,adminHeader:true, allCount} );  

})

router.get('/products',verifyAdminLogin, (req, res) => {
  let admin = req.session.admin

  productHelpers.getAllProductOnAdmin().then((products)=>{
    res.render('adminPage/view-products', { admin, products, adminHeader:true });
  });
});

router.get('/add-products', (req, res) => {
  let admin = req.session.admin

  res.render('adminPage/add-products', { admin,adminHeader:true });
});

router.post('/add-products', (req, res) => {
  req.body.price = parseInt(req.body.price)
  productHelpers.addProducts(req.body, (insertedId) => {
  
     const imageName = insertedId;

    let Image1 = req.files.Image1;
    Image1.mv('./public/product-Image1/' + imageName + '.jpg')

    let Image2 = req.files.Image2;
    Image2.mv('./public/product-Image2/' + imageName + '.jpg')
    let Image3 = req.files.Image3;
    Image3.mv('./public/product-Image3/' + imageName + '.jpg', (err) => {
         if (!err) {
           res.render('adminPage/add-products', { adminHeader:true });
         }else{
          console.log(err);
         }
       });


  });
});

router.get('/orders', (req,res)=>{

  res.render('adminPage/orders', {  });
})

router.get('/delete-product/:id', (req,res)=>{

  let productId = req.params.id
  console.log(productId);
  productHelpers.deleteProduct(productId).then(()=>{
    res.redirect('/admin/products')
  })
})

router.get('/edit-product/:id',async(req,res)=>{
  let admin = req.session.admin

  let productId = req.params.id
  let product = await productHelpers.getProductDetails(productId)
  res.render('adminPage/edit-products', { admin, product, adminHeader:true })
})

router.post('/edit-product/:id', (req,res)=>{

  let productId = req.params.id
  let productDetail = req.body
  console.log("ln 57"+productId);
  console.log("ln 58"+Object.values(productDetail));
  console.log("ln 59"+req.files.Image);
  productHelpers.updateProduct(productId, productDetail).then(()=>{
    res.redirect('/admin/products')
    if(req.files.Image){
      let image = req.files.Image
      image.mv('./public/product-images/'+productId+'.jpg')
    }
  })
})

router.get('/user-info',verifyAdminLogin, async(req, res)=>{
  let admin = req.session.admin

  let users =await adminHelpers.getAllUsers()
  let count  = users.length
    
  res.render('adminPage/user-info',{admin,users, adminHeader:true, count})

 
})

router.get('/user-block/:id',verifyAdminLogin, (req, res)=>{
    let userId = req.params.id
    console.log(userId)

    adminHelpers.blockUser(userId).then(()=>{
      let admin = req.session.admin
          res.redirect('../user-info')
     
    })
})

router.get('/user-unblock/:id',verifyAdminLogin, (req, res)=>{
  
  let userId = req.params.id
  adminHelpers.unblockUser(userId).then(()=>{
    res.redirect('../user-info')
  })
  
})



router.get('/sales-report', async(req, res)=>{
  let admin = req.session.admin

  let salesReport = await adminHelpers.getSalesReport()
  res.render('adminPage/sales-report',{admin,salesReport,adminHeader:true})
})
module.exports = router;
