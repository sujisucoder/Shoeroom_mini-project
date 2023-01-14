const { ObjectId } = require('mongodb');
const db = require('../config/connection');
const collection = require('../config/collection');
const { response } = require('../app');
const objectId = require('mongodb').ObjectId

module.exports = {

  addProducts: (details, callback) => {
    db.get().collection('product').insertOne(details).then((data) => {
      callback(data.insertedId);
    });
  },
  getAllProductOnAdmin:()=>{
    return new Promise(async(resolve, reject) => {
        let procucts = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
        resolve(procucts)
       
    })


  },

  deleteProduct: (productId)=>{
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(productId)}).then((data)=>{
        
        resolve(data)
      })
    })
  },
  getProductDetails: (productId)=>{
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(productId)}).then((product)=>{
        resolve(product)
      })
    })
  },

    updateProduct: (productId, productDetail)=>{
      return new Promise((resolve, reject) => {
        db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({_id:objectId(productId)}, {
          $set:{
            name: productDetail.name,
            brand: productDetail.brand,
            description: productDetail.description,
            price: productDetail.price
          }
        }).then((response)=>{
          resolve()
        })
      })
    }




};
