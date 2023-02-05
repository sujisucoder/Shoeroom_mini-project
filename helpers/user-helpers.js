const { response } = require('express');

const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const { PRODUCT_COLLECTION } = require('../config/collection');
const objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('node:path');

var instance = new Razorpay({
  key_id: 'rzp_test_y6o3hVmuSHhh14',
  key_secret: 'xrMvtnDf927dRQCmDK19fzOA',
})

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

getTotalAmount:(userId)=>{
         
  return new Promise(async(resolve, reject) => {

 try {
  console.log("log here");
  let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
    {
        $match:{user:objectId(userId)}
    },
{
    
    $unwind:'$products'
},
{
    $project:{
        item:'$products.item',
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
        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    }
},
{
 $group:{
    _id:null,
    total:{$sum:{$multiply:['$quantity','$product.price']}}
 }
}
]).toArray()
console.log(total);

resolve(total[0].total)
 } catch (err) {
  console.log(err);
  let total = 0
  resolve(total)
 }
  })
},

placeOrder:(orderDetails,products,total)=>{
  return new Promise((resolve, reject) => {
    let status = orderDetails['payment-method']==='COD'?'order placed':'order pending'
    let orderObj = {
      deliveryDetails:{
        email:orderDetails.email,
        address:orderDetails.address,
        pincode:orderDetails.pincode

      },
      userId:objectId(orderDetails.userId),
      paymentMethod:orderDetails['payment-method'],
      products:products,
      totalAmount:total,
      status:status,
      date:new Date()

    }
    db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
     
      db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(orderDetails.userId)})

      resolve(response.insertedId)
    })
  })
},



getCartProductList:(userId)=>{
 return new Promise(async(resolve, reject) => {
  let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
  resolve(cart.products)
 })
},

getUserOrderList:(userId)=>{
  return new Promise(async(resolve, reject) => {
   let orders =await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
    console.log(orders);
    resolve(orders)
  })
},

orderProducts:(orderId)=>{
  return new Promise(async(resolve, reject) => {
    let products = await db.get().collection(collection.ORDER_COLLECTION)
    .aggregate([
      {
        $match:{
          _id: objectId(orderId)
        }
      },
      {
        $unwind:'$products'
      },
      {
        $project:{item:'$products.item', quantity:'$products.quantity'}
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
          item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
        }
      }

    ]).toArray()
    console.log(products);
    resolve(products)
  })
  
},

generateRazorpay:(orderId , amount)=>{
  return new Promise(async(resolve, reject) => {

  let order =await  instance.orders.create({
      amount: amount,
      currency: "INR",
      receipt: ""+orderId,
    })
   
    console.log(order);  
    resolve(order)

  })
},

verifyPayment:(details)=>{
  return new Promise((resolve, reject) => {
    const { createHmac} = require('node:crypto');
    let hmac = createHmac('sha256', 'xrMvtnDf927dRQCmDK19fzOA');
    hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
      hmac =  hmac.digest('hex');
      if (hmac==details['payment[razorpay_signature]']) {
        resolve()
      }else{
        reject()
      }

  })

},

changePaymentStatus:(orderId)=>{
  return new Promise((resolve, reject) => {
  
    db.get().collection(collection.ORDER_COLLECTION)
    .updateOne({_id:objectId(orderId)},   {
      $set:{
        status:'placed'
      }
    })
    resolve()
  })
},

getDetailsOnProduct:(productId)=>{
  return new Promise(async(resolve, reject) => {
   let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(productId)})
    
    resolve(product)
  })
},

addUserAddress:(details,userId)=>{

  let profileDetails = {

    user:objectId(userId),
    firstName:details.firstName,
    lastName:details.lastName,
    email:details.email,
    phone:details.phone,
    pincode:details.pincode,
    flatBuilding:details.flatBuilding,
    areaStreet:details.areaStreet,
    landmark:details.landmark,
    townCity:details.townCity,
    state:details.state

  }


  return new Promise(async(resolve, reject) => {

     let address = db.get().collection(collection.ADDRESS_USER).insertOne(profileDetails).then((response)=>{
        resolve(response)
      })
    })
 
},

getUserAddress:(userId)=>{
  return new Promise(async(resolve, reject) => {
    let getAddress =await db.get().collection(collection.ADDRESS_USER).findOne({user:objectId(userId)})
    console.log(getAddress);
    resolve(getAddress)
  })
  
}
};
