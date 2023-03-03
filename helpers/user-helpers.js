const { response } = require('express');

const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const { PRODUCT_COLLECTION } = require('../config/collection');
const objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('node:path');
const { log } = require('node:console');

var accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
var authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from www.twilio.com/console
const serviceID = process.env.SERVICE_ID

const client = require('twilio')(accountSid, authToken);

var instance = new Razorpay({
  key_id: 'rzp_test_y6o3hVmuSHhh14',
  key_secret: 'xrMvtnDf927dRQCmDK19fzOA',
})

module.exports = {
  doSignup: (userdata) => {
   return new Promise(async(resolve, reject) => {
    //code changed
    delete userdata.confpassword;

    let phoneExist = await db.get().collection(collection.USER_COLLECTION).findOne({phone: userdata.phone})
  
    if (phoneExist == null ) {
      return new Promise(async(resolve, reject) => {
        console.log(userdata);
        hashPassword = await bcrypt.hash(userdata.password, 10);
        userdata.password = hashPassword;
        console.log(hashPassword);
        db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {
            resolve(data.insertedId);
        }).catch((error)=>{
          reject(error)
        })
                
      })
      .then((data)=>{
        resolve(data)
      }).catch((error)=>{
        reject(error)
      })
      
    }else{
      resolve({ phoneFound: true})
    }  

    })
  
  },
  
  doLogin: (userdata)=>{
    return new Promise(async(resolve, reject) => {
      let loginStatus = false
      let response ={}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({email:userdata.email})
      if (user) {
        //changed
        if(user.block){
          console.log("user is blocked")
          resolve({status: false})
        }else{
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
        }
        
      }else{
        console.log("login failed (no user exist)");
        resolve({status:false})

      }
    })
  },

  getDetailsOnOtp:(phone)=>{
    return new Promise(async(resolve, reject) => {
      let phoneNumber = phone
      let dbPhone =await db.get().collection(collection.USER_COLLECTION).findOne({number:phone})

      
      if (dbPhone===null) {
        resolve({phoneFound:false})
        
      }else{
          phoneNumber = '+91' + phoneNumber

          client
          .verify
          .services(serviceID)
          .verifications
          .create(({
            to: phoneNumber,
            channel: 'sms'
          }))
          .then((data)=>{
            resolve({phoneFound:true,dbPhone})
          })
          .catch((err)=>{
            console.log(err)
            resolve({phoneFound:false})
          })
      }
    })

  },

  verifyOtp:(phone, otp)=>{
    return new Promise(async(resolve, reject) => {
      phone = '+91' + phone

      if(otp.length === 6){
        await client
              .verify
              .services(serviceID)
              .verificationChecks
              .create({
                to: phone,
                code: otp
              })
              .then((data)=>{
                

                if(data.status == 'approved'){
                  otpVerify = true
                }else{
                  otpVerify = false
                }
              })

      }else{
        otpVerify =false
      }
      resolve(otpVerify)
      
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

    resolve(products)
  })
  
},

generateRazorpay:(orderId , amount)=>{
  return new Promise(async(resolve, reject) => {

  let order =await  instance.orders.create({
      amount: amount*100,
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
    state:details.state,
    default:details.default
  }


  return new Promise(async(resolve, reject) => {

     let address = db.get().collection(collection.ADDRESS_USER).insertOne(profileDetails).then((response)=>{
        resolve(response)
      })
    })
 
},

getUserAddress:(userId)=>{
  return new Promise(async(resolve, reject) => {

    let getAddress =await db.get().collection(collection.ADDRESS_USER).find({user:objectId(userId)}).toArray()
    resolve(getAddress)
  })
  
},

getUserAddressForUpdate:(addressId)=>{
  return new Promise(async(resolve, reject) => {

    let address = await db.get().collection(collection.ADDRESS_USER).findOne({_id:objectId(addressId)})
      resolve(address)
    
  })
},

updateUserAddress:(address,addressId)=>{
  return new Promise(async(resolve, reject) => {
   let addressof = await db.get().collection(collection.ADDRESS_USER).updateOne({_id:objectId(addressId)},{
      $set:{
        
        firstName:address.firstName,
        lastName:address.lastName,
        email:address.email,
        phone:address.phone,
        pincode:address.pincode,
        flatBuilding:address.flatBuilding,
        areaStreet:address.areaStreet,
        landmark:address.landmark,
        townCity:address.townCity,
        state:address.state
      }

    })
   
  })
},

changeDefaultAddress:(addressId,userId)=>{
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ADDRESS_USER).updateOne({ userId:objectId(userId), default: true},
        {
          $set: {
            default:false
          }
          }).then((response)=>{
            resolve()
        })
    })
},

changeDefaultAddress1:(addressId)=>{

  return new Promise((resolve, reject) => {
    try {
      db.get().collection(collection.ADDRESS_USER).updateOne({_id:objectId(addressId)},
     {
      $set:{
        default:true
      }
     }
      ).then((response)=>{
        resolve()
      })
    } catch  {
      reject()
      
    }
  })

},

removeAddress:(addressId)=>{
  return new Promise((resolve, reject) => {
    console.log("welcome to remove address")
    db.get().collection(collection.ADDRESS_USER).deleteOne({_id:objectId(addressId)})
  })
},

getUserOrderListByOrderId:(orderId)=>{
  return new Promise(async(resolve, reject) => {
   let orders =await db.get().collection(collection.ORDER_COLLECTION).find({_id:objectId(orderId)}).toArray()
   console.log(orders);
    resolve(orders)
  })
},

cancelOrder:(orderId)=>{
  return new Promise((resolve, reject) => {
      let orderCancel =   db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)}, 
    {
      $set:{
        status: "cancelled"
      }
      
    })
    .then((response)=>{


      resolve()

    }).catch((error)=>{
      reject(error)
    })
  })
}

};
