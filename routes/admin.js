const express = require('express');
const { response } = require('../app');
const productHelpers = require('../helpers/product-helpers');
const { route } = require('./users');

const router = express.Router();

/* GET users listing. */
router.get('/', (req, res) => {
  res.render('adminPage/view-home', { admin: true });
});

router.get('/products', (req, res) => {
  productHelpers.getAllProductOnAdmin().then((products)=>{
    res.render('adminPage/view-products', { admin: true, products });
  });
});

router.get('/add-products', (req, res) => {
  res.render('adminPage/add-products', { admin: true });
});

router.post('/add-products', (req, res) => {
  productHelpers.addProducts(req.body, (insertedId) => {
    const image = req.files.Image;
    const imageName = insertedId;

    image.mv(`./public/product-images/${imageName}.jpg`, (err) => {
      if (!err) {
        res.render('adminPage/add-products', { admin: true });
      }
    });
  });
});

router.get('/orders', (req,res)=>{
  res.render('adminPage/orders', { admin: true });
})

router.get('/delete-product/:id', (req,res)=>{
  let productId = req.params.id
  console.log(productId);
  productHelpers.deleteProduct(productId).then(()=>{
    res.redirect('/admin/products')
  })
})


module.exports = router;
