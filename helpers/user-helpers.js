const { response } = require('express');

const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const { PRODUCT_COLLECTION } = require('../config/collection');
const objectId = require('mongodb').ObjectId

module.exports = {
  doSignup: (userdata) => new Promise(async(resolve, reject) => {
  
    console.log(userdata);
    hashPassword = await bcrypt.hash(userdata.password, 10);
    userdata.password = hashPassword;
    delete userdata.confpassword;
   
    
    console.log(hashPassword);
     db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {
         resolve(data.insertedId);
     });
  }),

  doLogin: (userdata)=>{
    return new Promise(async(resolve, reject) => {
      let response ={}
      let loginStatus = false
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({email:userdata.email})
      if (user) {
        bcrypt.compare(userdata.password, user.password).then((status) => {
          if (status) {
            console.log("login successful");
            response.user = user
            response.status = true
            resolve(response)
          }else{
            console.log("login failed");
            resolve({status:false})
          }
      });
        
      }else{
        console.log("login failed");
        resolve({status:false})

      }
    })
  },
  addToCart:(proId,userId)=>{
    let proObj = {
        item:objectId(proId),
        quantity:1
    }

    return new Promise(async(resolve,reject)=>{
        var userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        if (userCart) {
            let proExist = userCart.products.findIndex(product=> product.item ==proId)
           
            if(proExist!=-1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:objectId(userId),'products.item':objectId(proId)},
                {
                    $inc:{'products.$.quantity':1}
                }
                ).then(()=>{
                    resolve()
                })
            }else{

            db.get().collection(collection.CART_COLLECTION) 
            .updateOne({user:objectId(userId)},
            {
              
                    $push:{products:proObj}
                
            }
            ).then((response)=>{
                resolve()
            })
         }
             
        }else{
            let cartobj = {
                user:objectId(userId),
                products:[proObj]

            }
            db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response)=>{
                resolve()
            })
        }
    })

},

  getAllProductOnUser:(userId)=>{
    return new Promise( async(resolve,reject)=>{
        let cartItems = await db.get().collection(collection.CART_COLLECTION)
        .aggregate([
            {
                $match: {user:objectId(userId)}
            },
            {
                 $unwind: '$products'
              },
              {
                $project:{
                    item: '$products.item',
                    quantity:'$products.quantity'

                }
              },
              {
                $lookup:{
                    from:collection.PRODUCT_COLLECTION,
                    localField:'item',
                    foreignField:'_id',
                    as:'product'
                }
              },
              {
                $project:{
                      item:1,
                      quantity:1,
                      product:{$arrayElemAt:['$product',0]}                        
                }
              }
                       
        ]).toArray()
        
        resolve(cartItems)
    })
},

  

  getCartCount:(userId)=>{
    return new Promise(async(resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
      if (cart) {
        count = cart.products.length
        
      }
      resolve(count)
    })
  },

  changeProductQuantity:(details)=>{
    details.count = parseInt(details.count)
    details.quantity = parseInt(details.quantity)

      return new Promise((resolve, reject) => {
         if(details.count==-1 && details.quantity==1)
         {
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart)},
            {
                $pull:{products:{item:objectId(details.product)}}
            }
            ).then((response)=>{
             
            resolve({removeProduct:true})
            })
          }else{
              db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
            {
                $inc:{'products.$.quantity':details.count}
            }
            ).then((response)=>{
             
            resolve({status:true})
            })
          }
      })
  },

  removeProduct:(details)=>{
    return new Promise((resolve, reject) => {

      db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
      {
        $pull:{products:{item:objectId(details.product)}}
      }
      ).then((response)=>{
        resolve({removeProduct:true})
      })
    })
},



};
