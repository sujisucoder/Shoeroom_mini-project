const { ObjectId } = require('mongodb');
const db = require('../config/connection');
const collection = require('../config/collection');
const { response } = require('../app');

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
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:ObjectId(productId)}).then((data)=>{
        
        resolve(data)
      })
    })
  }




};
