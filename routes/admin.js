const express = require('express');

const productHelpers = require('../helpers/product-helpers');
const adminHelpers = require('../helpers/admin-helpers')
const { route } = require('./users');
const excelJs = require("exceljs");

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
      res.redirect('/admin')
      
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

router.get('/products',verifyAdminLogin, (req, res) => {
  productHelpers.getAllProductOnAdmin().then((products)=>{
    res.render('adminPage/view-products', {  products, adminHeader:true });
  });
});

router.get('/add-products', (req, res) => {
  res.render('adminPage/add-products', { adminHeader:true });
});

router.post('/add-products', (req, res) => {
  productHelpers.addProducts(req.body, (insertedId) => {
    const image = req.files.Image;
    const imageName = insertedId;

    image.mv(`./public/product-images/${imageName}.jpg`, (err) => {
      if (!err) {
        res.render('adminPage/add-products', { adminHeader:true });
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
  let productId = req.params.id
  let product = await productHelpers.getProductDetails(productId)
  res.render('adminPage/edit-products', {  product, adminHeader:true })
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
module.exports = router;
